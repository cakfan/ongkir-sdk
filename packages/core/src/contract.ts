import type {
  CreateShipmentRequest,
  RateRequest,
  RateResult,
  ShipmentResult,
  TrackShipmentOptions,
  TrackingResult,
  WebhookEvent,
} from './types'

export interface ShippingProvider {
  getRates(params: RateRequest): Promise<RateResult[]>
  trackShipment(trackingId: string, options?: TrackShipmentOptions): Promise<TrackingResult>
  parseWebhook(payload: unknown, headers: Headers): WebhookEvent
  createShipment(params: CreateShipmentRequest): Promise<ShipmentResult>
}
