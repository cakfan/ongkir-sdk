import { describe, expect, it } from 'bun:test'
import type {
  RateRequest,
  RateResult,
  ShipmentResult,
  ShippingProvider,
  TrackingResult,
  WebhookEvent,
} from '@ongkir-sdk/core'
import { MemoryCacheProvider } from './index'

const rateRequest: RateRequest = {
  origin: { postalCode: '10110' },
  destination: { postalCode: '40111' },
  items: [{ weightGrams: 1000, quantity: 1 }],
}

class FakeProvider implements ShippingProvider {
  calls = 0
  rates: RateResult[] = [{ provider: 'fake', service: 'REG', cost: 9000, currency: 'IDR' }]

  async getRates(): Promise<RateResult[]> {
    this.calls++
    return this.rates
  }

  trackShipment(): Promise<TrackingResult> {
    throw new Error('not implemented')
  }

  parseWebhook(): WebhookEvent {
    throw new Error('not implemented')
  }

  createShipment(): Promise<ShipmentResult> {
    throw new Error('not implemented')
  }
}

describe('MemoryCacheProvider', () => {
  it('should cache getRates results within ttl', async () => {
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner })

    const first = await cached.getRates(rateRequest)
    const second = await cached.getRates(rateRequest)

    expect(first).toEqual(inner.rates)
    expect(second).toEqual(inner.rates)
    expect(inner.calls).toBe(1)
  })

  it('should re-fetch after ttl expires', async () => {
    let now = 0
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner, ttlMs: 1000, now: () => now })

    await cached.getRates(rateRequest)
    now = 1001
    const stale = await cached.getRates(rateRequest)
    expect(stale).toEqual(inner.rates)
    expect(inner.calls).toBe(2)
  })

  it('should treat ttlMs 0 as disabled cache', async () => {
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner, ttlMs: 0 })

    await cached.getRates(rateRequest)
    await cached.getRates(rateRequest)

    expect(inner.calls).toBe(2)
  })

  it('should use different cache keys for different requests', async () => {
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner })

    await cached.getRates(rateRequest)
    await cached.getRates({
      origin: { postalCode: '12440' },
      destination: { postalCode: '12240' },
      items: [{ weightGrams: 2000, quantity: 2 }],
    })
    await cached.getRates(rateRequest)

    expect(inner.calls).toBe(2)
  })

  it('should not mutate cached array for callers', async () => {
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner })

    const first = await cached.getRates(rateRequest)
    first.push({ provider: 'fake', service: 'TAMPERED', cost: 1, currency: 'IDR' })

    const second = await cached.getRates(rateRequest)
    expect(second).toHaveLength(1)
  })

  it('should expose clear()', async () => {
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner })

    await cached.getRates(rateRequest)
    cached.clear()
    await cached.getRates(rateRequest)

    expect(inner.calls).toBe(2)
  })

  it('should evict entries automatically once ttl elapses', async () => {
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner, ttlMs: 20 })

    await cached.getRates(rateRequest)
    expect(inner.calls).toBe(1)

    await new Promise((resolve) => setTimeout(resolve, 40))
    await cached.getRates(rateRequest)

    expect(inner.calls).toBe(2)
  })

  it('should not evict entries after clear() before ttl elapses', async () => {
    const inner = new FakeProvider()
    const cached = new MemoryCacheProvider({ provider: inner, ttlMs: 10 })

    await cached.getRates(rateRequest)
    cached.clear()

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(inner.calls).toBe(1)
  })
})
