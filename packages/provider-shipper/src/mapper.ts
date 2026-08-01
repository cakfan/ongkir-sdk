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

export interface ShipperLocationEntry {
  adm_level_5?: {
    id: number
    level?: number
    type?: string
    name?: string
    postcode?: string
  }
  postcodes?: string[]
}

export interface ShipperLocationResponse {
  metadata?: {
    path?: string
    http_status_code?: number
    http_status?: string
    timestamp?: number
  }
  data?: ShipperLocationEntry[] | null
}

export interface ShipperPricingItem {
  logistic?: {
    id?: number
    name?: string
    code?: string
    company_name?: string
  }
  rate?: {
    id?: number
    name?: string
    type?: string
    description?: string
  }
  weight?: number
  min_day?: number
  max_day?: number
  unit_price?: number
  final_price?: number
  discount?: number
  discounted_price?: number
  insurance_fee?: number
  must_use_insurance?: boolean
  liability_value?: number
  currency?: string
  insurance_applied?: boolean
}

export interface ShipperPricingResponse {
  metadata?: {
    path?: string
    http_status_code?: number
    http_status?: string
    timestamp?: number
  }
  data?: {
    origin?: unknown
    destination?: unknown
    pricings?: ShipperPricingItem[] | null
    pricing_errors?: Array<{ code?: number; message?: string; logistic_id?: number }> | null
  } | null
}

export interface ShipperOrderPackageItem {
  id?: number
  name?: string
  price?: number
  qty?: number
}

export interface ShipperTrackingEvent {
  shipper_status?: {
    code?: number
    name?: string
    description?: string
  }
  logistic_status?: {
    code?: number
    name?: string
    description?: string
  }
  created_date?: string
}

export interface ShipperOrderDetail {
  order_id?: string
  awb_number?: string
  external_id?: string
  origin?: { address?: string }
  destination?: { address?: string }
  package?: {
    weight?: number
    length?: number
    width?: number
    height?: number
    items?: ShipperOrderPackageItem[]
  }
  courier?: {
    rate_id?: number
    amount?: number
    use_insurance?: boolean
    insurance_amount?: number
    cod?: boolean
    min_day?: number
    max_day?: number
  }
  shipment_status?: {
    name?: string
    description?: string
    code?: number
    updated_date?: string
    track_url?: string
  }
  trackings?: ShipperTrackingEvent[]
  creation_date?: string
  last_updated_date?: string
}

export interface ShipperOrderDetailResponse {
  metadata?: unknown
  data?: ShipperOrderDetail | null
}

export interface ShipperCreateOrderRequest {
  consignee: {
    name: string
    phone_number: string
  }
  consigner: {
    name: string
    phone_number: string
  }
  courier: {
    cod: boolean
    /** Nilai COD yang ditagihkan ke penerima. Wajib agar order benar-benar dianggap COD. */
    cod_amount?: number
    rate_id: number
    use_insurance: boolean
  }
  coverage: string
  destination: {
    address: string
    area_id: number
  }
  external_id?: string
  origin: {
    address: string
    area_id: number
  }
  package: {
    height: number
    items: Array<{ name: string; price: number; qty: number }>
    length: number
    package_type: number
    price: number
    weight: number
    width: number
  }
  payment_type: string
}

export interface ShipperCreateOrderResponse {
  metadata?: unknown
  data?: {
    order_id?: string
    coverage?: string
    payment_type?: string
    courier?: {
      rate_id?: number
      amount?: number
      use_insurance?: boolean
      insurance_amount?: number
      cod?: boolean
    }
  } | null
}

export interface ShipperWebhookPayload {
  order_id?: string
  order_tracking_id?: string
  external_id?: string
  tracking_id?: string
  status_date?: string
  awb?: string
  external_status?: {
    code?: number
    name?: string
    description?: string
  }
  internal_status?: {
    code?: number
    name?: string
    description?: string
  }
}

export function getPostalCode(ref: RegionRef | { postalCode: string }): string | undefined {
  if ('postalCode' in ref && ref.postalCode) {
    return String(ref.postalCode).trim()
  }
  return undefined
}

export function toShipperAreaId(
  entries: ShipperLocationEntry[] | null | undefined,
  postalCode: string,
): number | undefined {
  if (!entries || entries.length === 0) return undefined
  const exact = entries.find((e) => e.adm_level_5?.postcode === postalCode || e.postcodes?.includes(postalCode))
  return exact?.adm_level_5?.id
}

interface AggregatedPackage {
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  itemValue: number
}

function aggregatePackage(
  items: Array<Pick<RateItem, 'weightGrams' | 'lengthCm' | 'widthCm' | 'heightCm' | 'value' | 'quantity'>>,
): AggregatedPackage {
  let totalGrams = 0
  let itemValue = 0
  let lengthCm = 1
  let widthCm = 1
  let heightCm = 1

  for (const item of items) {
    const quantity = item.quantity ?? 1
    totalGrams += item.weightGrams * quantity
    itemValue += (item.value ?? 0) * quantity
    lengthCm = Math.max(lengthCm, item.lengthCm ?? 1)
    widthCm = Math.max(widthCm, item.widthCm ?? 1)
    heightCm = Math.max(heightCm, item.heightCm ?? 1)
  }

  return {
    weightKg: totalGrams / 1000,
    lengthCm,
    widthCm,
    heightCm,
    itemValue,
  }
}

export function toShipperPricingRequest(
  request: RateRequest,
  originAreaId: number,
  destinationAreaId: number,
  options?: { cod?: boolean },
): Record<string, unknown> {
  const pkg = aggregatePackage(request.items)
  const origin = toAreaRef(request.origin, originAreaId)
  const destination = toAreaRef(request.destination, destinationAreaId)

  return {
    cod: options?.cod ?? false,
    destination,
    for_order: true,
    height: pkg.heightCm,
    item_value: pkg.itemValue,
    length: pkg.lengthCm,
    limit: 30,
    origin,
    page: 1,
    sort_by: ['final_price'],
    weight: pkg.weightKg,
    width: pkg.widthCm,
  }
}

function toAreaRef(ref: RateRequest['origin'], areaId: number): Record<string, unknown> {
  const area: Record<string, unknown> = { area_id: areaId }
  if ('lat' in ref && ref.lat !== undefined) area.lat = String(ref.lat)
  if ('lng' in ref && ref.lng !== undefined) area.lng = String(ref.lng)
  return area
}

export function toCoreRateResults(response: ShipperPricingResponse): RateResult[] {
  const pricings = response.data?.pricings ?? []
  return pricings.map((item) => {
    const courier = item.logistic?.code ?? item.logistic?.name ?? 'unknown'
    const service = item.rate?.name ?? 'unknown'
    const rate: RateResult = {
      provider: courier,
      service,
      description: item.rate?.description,
      cost: item.final_price ?? 0,
      currency: item.currency ?? 'IDR',
      estimatedDaysMin: item.min_day,
      estimatedDaysMax: item.max_day,
    }

    if (item.insurance_applied && item.insurance_fee && item.insurance_fee > 0) {
      rate.additionalServices = [{ name: 'insurance', cost: item.insurance_fee }]
    }

    return rate
  })
}

export function findMatchingRate(
  response: ShipperPricingResponse,
  courier: string,
  service: string,
): ShipperPricingItem | undefined {
  const pricings = response.data?.pricings ?? []
  return pricings.find(
    (item) =>
      (item.logistic?.code ?? '').toLowerCase() === courier.toLowerCase() &&
      (item.rate?.name ?? '').toLowerCase() === service.toLowerCase(),
  )
}

export function findRateId(response: ShipperPricingResponse, courier: string, service: string): number | undefined {
  return findMatchingRate(response, courier, service)?.rate?.id
}

export function toShipperCreateOrderRequest(
  request: CreateShipmentRequest,
  originAreaId: number,
  destinationAreaId: number,
  rateId: number,
  useInsurance: boolean,
): ShipperCreateOrderRequest {
  const pkg = aggregatePackage(request.items)
  const items = request.items.map((item) => ({
    name: item.name,
    price: item.value ?? 0,
    qty: item.quantity ?? 1,
  }))

  const courier: ShipperCreateOrderRequest['courier'] = {
    cod: Boolean(request.cashOnDelivery),
    rate_id: rateId,
    use_insurance: useInsurance,
  }
  if (request.cashOnDelivery) {
    courier.cod_amount = request.cashOnDelivery.amount
  }

  return {
    consignee: {
      name: request.destination.name,
      phone_number: normalizePhone(request.destination.phone),
    },
    consigner: {
      name: request.origin.name,
      phone_number: normalizePhone(request.origin.phone),
    },
    courier,
    coverage: 'domestic',
    destination: {
      address: request.destination.address,
      area_id: destinationAreaId,
    },
    ...(request.referenceId ? { external_id: request.referenceId } : {}),
    origin: {
      address: request.origin.address,
      area_id: originAreaId,
    },
    package: {
      height: pkg.heightCm,
      items,
      length: pkg.lengthCm,
      package_type: 2,
      price: pkg.itemValue,
      weight: pkg.weightKg,
      width: pkg.widthCm,
    },
    payment_type: 'postpay',
  }
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('62')) return digits
  return digits
}

export function toCoreShipmentResult(response: ShipperCreateOrderResponse, service: string): ShipmentResult {
  const order = response.data ?? {}
  return {
    provider: 'shipper',
    orderId: order.order_id ?? 'unknown',
    trackingId: order.order_id,
    service,
    status: 'created',
    normalizedStatus: 'confirmed',
    cost: order.courier?.amount ?? 0,
    currency: 'IDR',
  }
}

export function toCoreTrackingResult(response: ShipperOrderDetailResponse, trackingId: string): TrackingResult {
  const order = response.data
  if (!order) {
    return {
      provider: 'shipper',
      trackingId,
      status: 'unknown',
      statusHistory: [],
    }
  }

  return {
    provider: 'shipper',
    trackingId: order.order_id ?? trackingId,
    status: order.shipment_status?.name ?? 'unknown',
    statusHistory: (order.trackings ?? []).map((t) => ({
      status: t.shipper_status?.name ?? t.logistic_status?.name ?? 'unknown',
      timestamp: t.created_date ?? '',
      description: t.shipper_status?.description ?? t.logistic_status?.description,
    })),
    origin: order.origin?.address,
    destination: order.destination?.address,
    weight: order.package?.weight,
  }
}

export function toShipmentStatus(code?: number): ShipmentStatus {
  if (code === undefined) return 'unknown'
  if (code === 999) return 'cancelled'
  if (code >= 2000) return 'delivered'
  if (code === 1000) return 'confirmed'
  if (code >= 1001 && code <= 1044) return 'pickup'
  if (code >= 1050 && code <= 1190) return 'in_transit'
  if (code >= 1310 && code <= 1330) return 'in_transit'
  if (code === 1360) return 'pickup'
  return 'unknown'
}

export function toCoreWebhookEvent(payload: ShipperWebhookPayload): WebhookEvent {
  const status = payload.external_status ?? payload.internal_status
  const trackingId = payload.order_tracking_id ?? payload.order_id ?? 'unknown'
  const statusCode = status?.code
  const statusDate = payload.status_date ?? new Date().toISOString()
  const id = `${trackingId}-${statusCode ?? 'unknown'}-${statusDate}`

  return {
    id,
    provider: 'shipper',
    type: 'status',
    trackingId,
    status: status?.name ?? 'unknown',
    normalizedStatus: toShipmentStatus(statusCode),
    timestamp: statusDate,
    rawPayload: payload,
  }
}
