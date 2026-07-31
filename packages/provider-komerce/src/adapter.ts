import type {
  RateRequest,
  RateResult,
  ShippingProvider,
  TrackShipmentOptions,
  TrackingResult,
  WebhookEvent,
} from '@ongkir-sdk/core'
import { ShippingSDKError } from '@ongkir-sdk/core'
import { handleKomerceError } from './errors'
import { getPostalCode, pickDestinationId, toCoreRateResults, toCoreTrackingResult, toKomerceRateBody } from './mapper'
import type { KomerceRateResponse, KomerceSearchResponse, KomerceTrackingResponse } from './mapper'

type HttpClient = (url: string, init?: RequestInit) => Promise<Response>

export interface KomerceProviderConfig {
  apiKey: string
  baseUrl?: string
  httpClient?: HttpClient
}

const DEFAULT_BASE_URL = 'https://rajaongkir.komerce.id/api/v1'

export class KomerceProvider implements ShippingProvider {
  private apiKey: string
  private baseUrl: string
  private httpClient: HttpClient
  private regionIdCache = new Map<string, number>()

  constructor(config: KomerceProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.httpClient = config.httpClient ?? fetch
  }

  async getRates(params: RateRequest): Promise<RateResult[]> {
    const originId = await this.resolveRegionId(params.origin, 'origin')
    const destinationId = await this.resolveRegionId(params.destination, 'destination')

    const body = toKomerceRateBody(params, originId, destinationId)

    const response = await this.httpClient(`${this.baseUrl}/calculate/domestic-cost`, {
      method: 'POST',
      headers: {
        key: this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    })

    if (!response.ok) {
      await handleKomerceError(response, 'komerce')
    }

    const data = (await response.json()) as KomerceRateResponse
    return toCoreRateResults(data)
  }

  async trackShipment(trackingId: string, options?: TrackShipmentOptions): Promise<TrackingResult> {
    const courier = options?.courier
    if (!courier) {
      throw new ShippingSDKError({
        code: 'UNKNOWN',
        provider: 'komerce',
        message: 'RajaOngkir tracking requires a courier code — call trackShipment(trackingId, { courier: "jne" })',
        providerErrorCode: 'MISSING_COURIER',
      })
    }

    const response = await this.httpClient(
      `${this.baseUrl}/track/waybill?awb=${encodeURIComponent(trackingId)}&courier=${encodeURIComponent(courier)}`,
      {
        method: 'POST',
        headers: {
          key: this.apiKey,
        },
      },
    )

    if (!response.ok) {
      await handleKomerceError(response, 'komerce')
    }

    const data = (await response.json()) as KomerceTrackingResponse
    return toCoreTrackingResult(data, trackingId)
  }

  parseWebhook(_payload: unknown, _headers: Headers): WebhookEvent {
    throw new ShippingSDKError({
      code: 'WEBHOOK_NOT_SUPPORTED',
      provider: 'komerce',
      message:
        'The RajaOngkir Shipping Cost tier does not provide webhooks. Webhook delivery is only available on the Enterprise-tier Shipping Delivery API.',
    })
  }

  private async resolveRegionId(ref: RateRequest['origin'], side: 'origin' | 'destination'): Promise<number> {
    const postalCode = getPostalCode(ref)
    if (!postalCode) {
      throw new ShippingSDKError({
        code: side === 'origin' ? 'INVALID_ORIGIN' : 'INVALID_DESTINATION',
        provider: 'komerce',
        message: `RajaOngkir requires a postal code in ${side} to resolve the location id`,
      })
    }

    const cached = this.regionIdCache.get(postalCode)
    if (cached !== undefined) return cached

    const response = await this.httpClient(
      `${this.baseUrl}/destination/domestic-destination?search=${encodeURIComponent(postalCode)}&limit=10&offset=0`,
      {
        method: 'GET',
        headers: {
          key: this.apiKey,
        },
      },
    )

    if (!response.ok) {
      try {
        await handleKomerceError(response, 'komerce')
      } catch (err) {
        if (err instanceof ShippingSDKError && err.code === 'INVALID_DESTINATION') {
          throw new ShippingSDKError({
            code: side === 'origin' ? 'INVALID_ORIGIN' : 'INVALID_DESTINATION',
            provider: 'komerce',
            message: err.message,
            providerErrorCode: err.providerErrorCode,
            retryable: err.retryable,
          })
        }
        throw err
      }
    }

    const data = (await response.json()) as KomerceSearchResponse
    const id = pickDestinationId(data.data, postalCode)
    if (id === undefined) {
      throw new ShippingSDKError({
        code: side === 'origin' ? 'INVALID_ORIGIN' : 'INVALID_DESTINATION',
        provider: 'komerce',
        message: `RajaOngkir could not resolve a location for postal code ${postalCode}`,
        providerErrorCode: data.meta?.message,
      })
    }

    this.regionIdCache.set(postalCode, id)
    return id
  }
}
