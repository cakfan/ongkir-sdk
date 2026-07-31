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
  /** Status ternormalisasi lintas provider (opsional, kalau payload bisa di-map). */
  normalizedStatus?: ShipmentStatus
  timestamp: string
  rawPayload: unknown
}

export interface ShipmentContact {
  name: string
  phone: string
  email?: string
  address: string
  postalCode?: string
}

export interface ShipmentItem {
  name: string
  sku?: string
  description?: string
  value?: number
  quantity?: number
  weightGrams: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}

export interface CreateShipmentRequest {
  origin: ShipmentContact
  destination: ShipmentContact
  items: ShipmentItem[]
  /** Kode kurir — cocokkan dengan `RateResult.provider`. */
  courier: string
  /** Tipe layanan — cocokkan dengan `RateResult.service`. */
  service: string
  /** ID idempotency dari sistem consumer (mis. nomor invoice). */
  referenceId?: string
  note?: string
  cashOnDelivery?: {
    amount: number
  }
}

/** Status pengiriman ternormalisasi lintas provider. */
export type ShipmentStatus = 'confirmed' | 'pickup' | 'in_transit' | 'delivered' | 'cancelled' | 'unknown'

export interface ShipmentResult {
  provider: string
  /** ID order di sistem provider. */
  orderId: string
  awb?: string
  trackingId?: string
  service: string
  /** Status mentah dari provider. */
  status: string
  /** Status ternormalisasi lintas provider. */
  normalizedStatus?: ShipmentStatus
  cost: number
  currency: string
  estimatedDelivery?: string
}
