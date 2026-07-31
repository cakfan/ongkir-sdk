export interface RegionRef {
  provinceCode: string
  cityCode: string
  districtCode: string
  postalCode?: string
  lat?: number
  lng?: number
}

export interface RateItem {
  weightGrams: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  quantity?: number
  value?: number
}

export interface RateRequest {
  origin: RegionRef | { postalCode: string }
  destination: RegionRef | { postalCode: string }
  items: RateItem[]
}

export interface RateResult {
  provider: string
  service: string
  description?: string
  cost: number
  currency: string
  estimatedDaysMin?: number
  estimatedDaysMax?: number
  additionalServices?: Array<{
    name: string
    cost: number
  }>
}

export interface TrackShipmentOptions {
  /** Courier code required by providers whose tracking API needs it (e.g. RajaOngkir). Ignored by others. */
  courier?: string
}

export interface TrackingResult {
  provider: string
  trackingId: string
  status: string
  statusHistory: Array<{
    status: string
    timestamp: string
    location?: string
    description?: string
  }>
  estimatedDelivery?: string
  origin?: string
  destination?: string
  weight?: number
}

export interface WebhookEvent {
  id: string
  provider: string
  type: string
  trackingId: string
  status: string
  timestamp: string
  rawPayload: unknown
}

export interface CreateShipmentRequest {
  origin: RegionRef | { postalCode: string }
  destination: RegionRef | { postalCode: string }
  items: RateItem[]
  service: string
  provider: string
}

export interface ShipmentResult {
  provider: string
  awb: string
  service: string
  status: string
  cost: number
  currency: string
  estimatedDelivery?: string
}
