import type { RateRequest, RateResult, RegionRef, TrackingResult } from '@ongkir-sdk/core'

export const KOMERCE_COURIERS = [
  'jne',
  'sicepat',
  'ide',
  'sap',
  'ninja',
  'jnt',
  'tiki',
  'wahana',
  'pos',
  'sentral',
  'lion',
  'rex',
] as const

export interface KomerceMeta {
  message?: string
  code?: number
  status?: string
}

export interface KomerceDestination {
  id: number
  label: string
  province_name: string
  city_name: string
  district_name: string
  subdistrict_name: string
  zip_code: string
}

export interface KomerceSearchResponse {
  meta: KomerceMeta
  data: KomerceDestination[] | null
}

export interface KomerceRateItem {
  name: string
  code: string
  service: string
  description?: string
  cost: number
  etd?: string
}

export interface KomerceRateResponse {
  meta: KomerceMeta
  data: KomerceRateItem[] | null
}

export interface KomerceTrackingResponse {
  meta: KomerceMeta
  data: {
    delivered: boolean
    summary: {
      courier_code: string
      courier_name: string
      waybill_number: string
      service_code?: string
      waybill_date?: string
      shipper_name?: string
      receiver_name?: string
      origin?: string
      destination?: string
      status: string
    }
    details?: {
      weight?: string
    }
    manifest: Array<{
      manifest_code?: string
      manifest_description?: string
      manifest_date?: string
      manifest_time?: string
      city_name?: string
    }>
  } | null
}

export function getPostalCode(ref: RegionRef | { postalCode: string }): string | undefined {
  if ('postalCode' in ref && ref.postalCode) {
    return String(ref.postalCode).trim()
  }
  return undefined
}

export function toKomerceRateBody(
  request: RateRequest,
  originId: number,
  destinationId: number,
): Record<string, string> {
  const weight = request.items.reduce((total, item) => total + item.weightGrams * (item.quantity ?? 1), 0)

  return {
    origin: String(originId),
    destination: String(destinationId),
    weight: String(Math.round(weight)),
    courier: KOMERCE_COURIERS.join(':'),
    price: 'lowest',
  }
}

function parseEtd(etd?: string): { min?: number; max?: number } {
  if (!etd) return {}
  const range = etd.match(/(\d+)\s*-\s*(\d+)/)
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) }
  }
  const single = etd.match(/(\d+)/)
  if (single) {
    return { min: Number(single[1]), max: Number(single[1]) }
  }
  return {}
}

export function toCoreRateResults(response: KomerceRateResponse): RateResult[] {
  if (!response.data) return []
  return response.data.map((item) => {
    const etd = parseEtd(item.etd)
    return {
      provider: item.code,
      service: item.service.toLowerCase(),
      description: item.description,
      cost: item.cost,
      currency: 'IDR',
      estimatedDaysMin: etd.min,
      estimatedDaysMax: etd.max,
    }
  })
}

export function toCoreTrackingResult(response: KomerceTrackingResponse, trackingId: string): TrackingResult {
  const data = response.data
  if (!data) {
    return {
      provider: 'komerce',
      trackingId,
      status: 'unknown',
      statusHistory: [],
    }
  }

  return {
    provider: 'komerce',
    trackingId: data.summary.waybill_number || trackingId,
    status: data.summary.status,
    statusHistory: data.manifest.map((m) => ({
      status: m.manifest_description ?? m.manifest_code ?? 'unknown',
      timestamp: [m.manifest_date, m.manifest_time].filter(Boolean).join(' '),
      location: m.city_name,
      description: m.manifest_description,
    })),
    origin: data.summary.origin,
    destination: data.summary.destination,
    weight: data.details?.weight ? Number(data.details.weight) : undefined,
  }
}

export function pickDestinationId(data: KomerceDestination[] | null, postalCode: string): number | undefined {
  if (!data || data.length === 0) return undefined
  const exact = data.find((d) => d.zip_code === postalCode)
  return (exact ?? data[0])?.id
}
