import type {
  CreateShipmentRequest,
  RateItem,
  RateRequest,
  RateResult,
  RegionRef,
  ShipmentResult,
  ShipmentStatus,
  TrackingResult,
  WebhookEvent,
} from '@ongkir-sdk/core'

export interface BiteshipItem {
  name: string
  description?: string
  value: number
  quantity: number
  weight: number
  length?: number
  width?: number
  height?: number
}

export interface BiteshipRateRequest {
  origin_postal_code?: number
  destination_postal_code?: number
  origin_area_id?: string
  destination_area_id?: string
  couriers: string
  items: BiteshipItem[]
}

export interface BiteshipPricing {
  company: string
  courier_name: string
  courier_code: string
  courier_service_name: string
  courier_service_code: string
  currency: string
  description?: string
  duration?: string
  shipment_duration_range?: string
  shipment_duration_unit?: string
  price: number
  insurance_fee?: number
  cash_on_delivery_fee?: number
  shipping_fee?: number
  shipping_fee_discount?: number
  shipping_fee_surcharge?: number
}

export interface BiteshipRateResponse {
  success: boolean
  object: string
  pricing: BiteshipPricing[]
}

export interface BiteshipTrackingHistory {
  note: string
  status: string
  updated_at: string
  service_type?: string
}

export interface BiteshipCourier {
  company: string
  driver_name?: string
  driver_phone?: string
}

export interface BiteshipTrackingResponse {
  success: boolean
  id: string
  waybill_id?: string
  courier?: BiteshipCourier
  origin?: { contact_name?: string; address?: string }
  destination?: { contact_name?: string; address?: string }
  history: BiteshipTrackingHistory[]
  status: string
  order_id?: string
}

export interface BiteshipWebhookPayload {
  event: string
  order_id?: string
  courier_tracking_id?: string
  courier_waybill_id?: string
  courier_company?: string
  courier_type?: string
  status?: string
  order_price?: number
  price?: number
}

export interface BiteshipCreateOrderRequest {
  origin: {
    contact_name: string
    contact_phone: string
    contact_email?: string
    address: string
    postal_code?: number
  }
  destination: {
    contact_name: string
    contact_phone: string
    contact_email?: string
    address: string
    postal_code?: number
    cash_on_delivery?: { amount: number }
  }
  courier: {
    company: string
    type: string
  }
  items: Array<{
    name: string
    description?: string
    value: number
    quantity: number
    weight: number
    length?: number
    width?: number
    height?: number
  }>
  reference_id?: string
  note?: string
}

export interface BiteshipCreateOrderResponse {
  success: boolean
  id: string
  waybill_id?: string
  courier?: {
    tracking_id?: string
    company?: string
    type?: string
  }
  price?: number
  currency?: string
  status?: string
}

export function toBiteshipRateRequest(request: RateRequest): BiteshipRateRequest {
  const items: BiteshipItem[] = request.items.map(toBiteshipItem)

  const originPostal = getPostalCode(request.origin)
  const destPostal = getPostalCode(request.destination)

  const body: BiteshipRateRequest = {
    couriers: 'jne,sicepat,jnt,anteraja,ninja,ide,pos,paxel,rpx,sap,spx',
    items,
  }

  if (originPostal !== undefined) body.origin_postal_code = originPostal
  if (destPostal !== undefined) body.destination_postal_code = destPostal

  return body
}

function getPostalCode(ref: RegionRef | { postalCode: string }): number | undefined {
  if ('postalCode' in ref && ref.postalCode) {
    const parsed = Number(ref.postalCode)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  return undefined
}

function toBiteshipItem(item: RateItem): BiteshipItem {
  return {
    name: 'Item',
    value: item.value ?? 0,
    quantity: item.quantity ?? 1,
    weight: item.weightGrams,
    length: item.lengthCm,
    width: item.widthCm,
    height: item.heightCm,
  }
}

function parseDuration(duration?: string): { min?: number; max?: number } {
  if (!duration) return {}
  const match = duration.match(/(\d+)\s*-\s*(\d+)/)
  if (match) {
    return { min: Number(match[1]), max: Number(match[2]) }
  }
  const single = duration.match(/(\d+)/)
  if (single) {
    return { min: Number(single[1]), max: Number(single[1]) }
  }
  return {}
}

export function toCoreRateResults(response: BiteshipRateResponse): RateResult[] {
  return response.pricing.map((p) => {
    const duration = parseDuration(
      p.shipment_duration_range ? `${p.shipment_duration_range} ${p.shipment_duration_unit ?? 'days'}` : p.duration,
    )
    return {
      provider: p.company,
      service: p.courier_service_code,
      description: p.description ?? p.courier_service_name,
      cost: p.price,
      currency: p.currency,
      estimatedDaysMin: duration.min,
      estimatedDaysMax: duration.max,
      additionalServices: getAdditionalServices(p),
    }
  })
}

function getAdditionalServices(p: BiteshipPricing): RateResult['additionalServices'] {
  const services: RateResult['additionalServices'] = []
  if (p.insurance_fee && p.insurance_fee > 0) {
    services.push({ name: 'insurance', cost: p.insurance_fee })
  }
  if (p.cash_on_delivery_fee && p.cash_on_delivery_fee > 0) {
    services.push({ name: 'cash_on_delivery', cost: p.cash_on_delivery_fee })
  }
  return services
}

export function toBiteshipCreateOrderRequest(request: CreateShipmentRequest): BiteshipCreateOrderRequest {
  return {
    origin: {
      contact_name: request.origin.name,
      contact_phone: request.origin.phone,
      contact_email: request.origin.email,
      address: request.origin.address,
      ...(request.origin.postalCode ? { postal_code: Number(request.origin.postalCode) } : {}),
    },
    destination: {
      contact_name: request.destination.name,
      contact_phone: request.destination.phone,
      contact_email: request.destination.email,
      address: request.destination.address,
      ...(request.destination.postalCode ? { postal_code: Number(request.destination.postalCode) } : {}),
      ...(request.cashOnDelivery ? { cash_on_delivery: { amount: request.cashOnDelivery.amount } } : {}),
    },
    courier: {
      company: request.courier,
      type: request.service,
    },
    items: request.items.map((item) => ({
      name: item.name,
      description: item.description,
      value: item.value ?? 0,
      quantity: item.quantity ?? 1,
      weight: item.weightGrams,
      length: item.lengthCm,
      width: item.widthCm,
      height: item.heightCm,
    })),
    ...(request.referenceId ? { reference_id: request.referenceId } : {}),
    ...(request.note ? { note: request.note } : {}),
  }
}

export function toCoreShipmentResult(response: BiteshipCreateOrderResponse): ShipmentResult {
  return {
    provider: 'biteship',
    orderId: response.id,
    awb: response.waybill_id,
    trackingId: response.courier?.tracking_id,
    service: response.courier?.type ?? 'unknown',
    status: response.status ?? 'unknown',
    normalizedStatus: toShipmentStatus(response.status),
    cost: response.price ?? 0,
    currency: response.currency ?? 'IDR',
  }
}

export function toShipmentStatus(status?: string): ShipmentStatus {
  switch (status?.toLowerCase()) {
    case 'pending':
    case 'confirmed':
      return 'confirmed'
    case 'allocated':
    case 'picked':
      return 'pickup'
    case 'delivering':
    case 'in_transit':
      return 'in_transit'
    case 'delivered':
      return 'delivered'
    case 'cancelled':
    case 'canceled':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

export function toCoreTrackingResult(response: BiteshipTrackingResponse): TrackingResult {
  return {
    provider: 'biteship',
    trackingId: response.id,
    status: response.status,
    statusHistory: response.history.map((h) => ({
      status: h.status,
      timestamp: h.updated_at,
      description: h.note,
    })),
    origin: response.origin?.address,
    destination: response.destination?.address,
  }
}

export function toCoreWebhookEvent(payload: BiteshipWebhookPayload, _headers: Headers): WebhookEvent {
  const event = payload.event ?? 'unknown'
  const status = payload.status ?? 'unknown'
  const trackingId = payload.courier_tracking_id ?? payload.order_id ?? 'unknown'
  const timestamp = new Date().toISOString()
  const id = `${event}-${trackingId}-${status}-${timestamp}`

  return {
    id,
    provider: 'biteship',
    type: event,
    trackingId,
    status,
    normalizedStatus: toShipmentStatus(status),
    timestamp,
    rawPayload: payload,
  }
}

export function toBiteshipAreaId(_region: RegionRef): string {
  throw new Error('Biteship area ID mapping not yet implemented — use postal code based rates instead')
}
