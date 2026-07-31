import type {
  CreateShipmentRequest,
  RateRequest,
  RateResult,
  ShipmentResult,
  ShippingProvider,
  TrackingResult,
  WebhookEvent,
} from '@ongkir-sdk/core'
import { handleBiteshipError } from './errors'
import {
  toBiteshipCreateOrderRequest,
  toBiteshipRateRequest,
  toCoreRateResults,
  toCoreShipmentResult,
  toCoreTrackingResult,
  toCoreWebhookEvent,
} from './mapper'
import type {
  BiteshipCreateOrderResponse,
  BiteshipRateResponse,
  BiteshipTrackingResponse,
  BiteshipWebhookPayload,
} from './mapper'

type HttpClient = (url: string, init?: RequestInit) => Promise<Response>

export interface BiteshipProviderConfig {
  apiKey: string
  baseUrl?: string
  httpClient?: HttpClient
}

export class BiteshipProvider implements ShippingProvider {
  private apiKey: string
  private baseUrl: string
  private httpClient: HttpClient

  constructor(config: BiteshipProviderConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = (config.baseUrl ?? 'https://api.biteship.com').replace(/\/+$/, '')
    this.httpClient = config.httpClient ?? fetch
  }

  async getRates(params: RateRequest): Promise<RateResult[]> {
    const body = toBiteshipRateRequest(params)

    const response = await this.httpClient(`${this.baseUrl}/v1/rates/couriers`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      await handleBiteshipError(response, 'biteship')
    }

    const data = (await response.json()) as BiteshipRateResponse
    return toCoreRateResults(data)
  }

  async trackShipment(trackingId: string): Promise<TrackingResult> {
    const response = await this.httpClient(`${this.baseUrl}/v1/trackings/${trackingId}`, {
      method: 'GET',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      await handleBiteshipError(response, 'biteship')
    }

    const data = (await response.json()) as BiteshipTrackingResponse
    return toCoreTrackingResult(data)
  }

  async createShipment(params: CreateShipmentRequest): Promise<ShipmentResult> {
    const body = toBiteshipCreateOrderRequest(params)

    const response = await this.httpClient(`${this.baseUrl}/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      await handleBiteshipError(response, 'biteship')
    }

    const data = (await response.json()) as BiteshipCreateOrderResponse
    return toCoreShipmentResult(data)
  }

  parseWebhook(payload: unknown, headers: Headers): WebhookEvent {
    return toCoreWebhookEvent(payload as BiteshipWebhookPayload, headers)
  }
}
