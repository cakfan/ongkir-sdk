import type {
  CreateShipmentRequest,
  RateRequest,
  RateResult,
  ShipmentResult,
  ShippingProvider,
  TrackShipmentOptions,
  TrackingResult,
  WebhookEvent,
} from '@ongkir-sdk/core'

export const DEFAULT_TTL_MS = 5 * 60 * 1000

interface CachedRateResult {
  value: RateResult[]
  expiresAt: number
}

export interface MemoryCacheOptions {
  provider: ShippingProvider
  /** Umur cache dalam ms. Default 5 menit. `0` mematikan caching. */
  ttlMs?: number
  /** Supplier waktu (untuk testing). Default `Date.now`. */
  now?: () => number
}

/** Membungkus ShippingProvider dan meng-cache hasil getRates di memori. */
export class MemoryCacheProvider implements ShippingProvider {
  private readonly inner: ShippingProvider
  private readonly ttlMs: number
  private readonly now: () => number
  private readonly cache = new Map<string, CachedRateResult>()
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(options: MemoryCacheOptions) {
    this.inner = options.provider
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.now = options.now ?? (() => Date.now())
  }

  async getRates(params: RateRequest): Promise<RateResult[]> {
    if (this.ttlMs <= 0) {
      return this.inner.getRates(params)
    }

    const key = this.cacheKey(params)
    const now = this.now()

    const hit = this.cache.get(key)
    if (hit && hit.expiresAt > now) {
      return cloneRates(hit.value)
    }

    const rates = await this.inner.getRates(params)
    this.setEntry(key, rates, now)
    return cloneRates(rates)
  }

  trackShipment(trackingId: string, options?: TrackShipmentOptions): Promise<TrackingResult> {
    return this.inner.trackShipment(trackingId, options)
  }

  parseWebhook(payload: unknown, headers: Headers): WebhookEvent {
    return this.inner.parseWebhook(payload, headers)
  }

  createShipment(params: CreateShipmentRequest): Promise<ShipmentResult> {
    return this.inner.createShipment(params)
  }

  /** Menghapus seluruh isi cache dan membatalkan timer eviction yang tertunda. */
  clear(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.cache.clear()
  }

  private setEntry(key: string, value: RateResult[], now: number): void {
    const expiresAt = now + this.ttlMs
    const existing = this.timers.get(key)
    if (existing !== undefined) {
      clearTimeout(existing)
    }

    this.cache.set(key, { value, expiresAt })
    const timer = setTimeout(() => {
      this.cache.delete(key)
      this.timers.delete(key)
    }, this.ttlMs)
    this.timers.set(key, timer)
  }

  private cacheKey(params: RateRequest): string {
    return JSON.stringify({
      origin: stableRegionRef(params.origin),
      destination: stableRegionRef(params.destination),
      items: params.items,
    })
  }
}

function stableRegionRef(ref: RateRequest['origin']): unknown {
  if ('postalCode' in ref && ref.postalCode !== undefined && Object.keys(ref).length === 1) {
    return { postalCode: ref.postalCode }
  }
  return ref
}

function cloneRates(rates: RateResult[]): RateResult[] {
  return rates.map((rate) => ({ ...rate, additionalServices: rate.additionalServices?.map((s) => ({ ...s })) }))
}
