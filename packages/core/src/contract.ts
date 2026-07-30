import type {
  CreateShipmentRequest,
  RateRequest,
  RateResult,
  ShipmentResult,
  TrackingResult,
  WebhookEvent,
} from './types'

export interface ShippingProvider {
  getRates(params: RateRequest): Promise<RateResult[]>
  trackShipment(trackingId: string): Promise<TrackingResult>
  parseWebhook(payload: unknown, headers: Headers): WebhookEvent
  createShipment?(params: CreateShipmentRequest): Promise<ShipmentResult>
}
