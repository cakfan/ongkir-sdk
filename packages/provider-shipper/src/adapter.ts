import type {
  CreateShipmentRequest,
  RateRequest,
  RateResult,
  ShipmentResult,
  ShippingProvider,
  TrackingResult,
  WebhookEvent,
} from '@ongkir-sdk/core'
import { ShippingSDKError } from '@ongkir-sdk/core'
import { handleShipperError } from './errors'
import {
  findMatchingRate,
  getPostalCode,
  toCoreRateResults,
  toCoreShipmentResult,
  toCoreTrackingResult,
  toCoreWebhookEvent,
  toShipperAreaId,
  toShipperCreateOrderRequest,
  toShipperPricingRequest,
} from './mapper'
import type {
  ShipperCreateOrderResponse,
  ShipperLocationResponse,
  ShipperOrderDetailResponse,
  ShipperPricingResponse,
  ShipperWebhookPayload,
} from './mapper'

type HttpClient = (url: string, init?: RequestInit) => Promise<Response>

export interface ShipperProviderConfig {
  apiKey: string
  baseUrl?: string
  httpClient?: HttpClient
}

const DEFAULT_BASE_URL = 'https://merchant-api.shipper.id'

export class ShipperProvider implements ShippingProvider {
  private apiKey: string
  private baseUrl: string
  private httpClient: HttpClient
  private areaIdCache = new Map<string, number>()

  constructor(config: ShipperProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
    this.httpClient = config.httpClient ?? fetch
  }

  async getRates(params: RateRequest): Promise<RateResult[]> {
    const originAreaId = await this.resolveAreaId(params.origin, 'origin')
    const destinationAreaId = await this.resolveAreaId(params.destination, 'destination')

    const body = toShipperPricingRequest(params, originAreaId, destinationAreaId)

    const response = await this.httpClient(`${this.baseUrl}/v3/pricing/domestic`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      await handleShipperError(response, 'shipper', 'RATE_NOT_AVAILABLE')
    }

    const data = (await response.json()) as ShipperPricingResponse
    return toCoreRateResults(data)
  }

  async trackShipment(trackingId: string): Promise<TrackingResult> {
    const response = await this.httpClient(`${this.baseUrl}/v3/order/${encodeURIComponent(trackingId)}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      await handleShipperError(response, 'shipper', 'TRACKING_NOT_FOUND')
    }

    const data = (await response.json()) as ShipperOrderDetailResponse
    return toCoreTrackingResult(data, trackingId)
  }

  async createShipment(params: CreateShipmentRequest): Promise<ShipmentResult> {
    const resolved = await this.resolveRateId(params)
    if (resolved === undefined) {
      throw new ShippingSDKError({
        code: 'RATE_NOT_AVAILABLE',
        provider: 'shipper',
        message: `No matching Shipper rate found for courier "${params.courier}" and service "${params.service}"`,
      })
    }

    const body = toShipperCreateOrderRequest(
      params,
      await this.resolveAreaId({ postalCode: params.origin.postalCode ?? '' }, 'origin'),
      await this.resolveAreaId({ postalCode: params.destination.postalCode ?? '' }, 'destination'),
      resolved.rateId,
      resolved.useInsurance,
    )

    const response = await this.httpClient(`${this.baseUrl}/v3/order`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      await handleShipperError(response, 'shipper', 'CREATE_SHIPMENT_FAILED')
    }

    const data = (await response.json()) as ShipperCreateOrderResponse
    return toCoreShipmentResult(data, params.service)
  }

  parseWebhook(payload: unknown, _headers: Headers): WebhookEvent {
    return toCoreWebhookEvent(payload as ShipperWebhookPayload)
  }

  private async resolveAreaId(ref: RateRequest['origin'], side: 'origin' | 'destination'): Promise<number> {
    const postalCode = getPostalCode(ref)
    if (!postalCode) {
      throw new ShippingSDKError({
        code: side === 'origin' ? 'INVALID_ORIGIN' : 'INVALID_DESTINATION',
        provider: 'shipper',
        message: `Shipper requires a postal code in ${side} to resolve the area id`,
      })
    }

    const cached = this.areaIdCache.get(postalCode)
    if (cached !== undefined) return cached

    const response = await this.httpClient(
      `${this.baseUrl}/v3/location?adm_level=5&keyword=${encodeURIComponent(postalCode)}`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      },
    )

    if (!response.ok) {
      await handleShipperError(response, 'shipper', side === 'origin' ? 'INVALID_ORIGIN' : 'INVALID_DESTINATION')
    }

    const data = (await response.json()) as ShipperLocationResponse
    const areaId = toShipperAreaId(data.data, postalCode)
    if (areaId === undefined) {
      throw new ShippingSDKError({
        code: side === 'origin' ? 'INVALID_ORIGIN' : 'INVALID_DESTINATION',
        provider: 'shipper',
        message: `Shipper could not resolve an area for postal code ${postalCode}`,
      })
    }

    this.areaIdCache.set(postalCode, areaId)
    return areaId
  }

  private async resolveRateId(
    params: CreateShipmentRequest,
  ): Promise<{ rateId: number; useInsurance: boolean } | undefined> {
    const originPostal = params.origin.postalCode ?? ''
    const destinationPostal = params.destination.postalCode ?? ''

    const body = toShipperPricingRequest(
      {
        origin: { postalCode: originPostal },
        destination: { postalCode: destinationPostal },
        items: params.items,
      },
      await this.resolveAreaId({ postalCode: originPostal }, 'origin'),
      await this.resolveAreaId({ postalCode: destinationPostal }, 'destination'),
      { cod: Boolean(params.cashOnDelivery) },
    )

    const response = await this.httpClient(`${this.baseUrl}/v3/pricing/domestic`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      await handleShipperError(response, 'shipper', 'CREATE_SHIPMENT_FAILED')
    }

    const data = (await response.json()) as ShipperPricingResponse
    const match = findMatchingRate(data, params.courier, params.service)
    if (!match?.rate?.id) return undefined
    return { rateId: match.rate.id, useInsurance: Boolean(match.must_use_insurance) }
  }
}
