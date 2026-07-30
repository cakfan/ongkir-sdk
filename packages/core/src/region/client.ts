export interface RegionApiResponse {
  provinceCode: string
  cityCode: string
  districtCode: string
  postalCode?: string
  lat?: number
  lng?: number
}

export interface RegionApiQuery {
  province?: string
  city?: string
  district?: string
  postalCode?: string
}

export class RegionApiClient {
  private baseUrl: string

  constructor(baseUrl = 'https://wilayah.id/api') {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  async resolve(query: RegionApiQuery): Promise<RegionApiResponse | null> {
    const params = new URLSearchParams()
    if (query.province) params.set('province', query.province)
    if (query.city) params.set('city', query.city)
    if (query.district) params.set('district', query.district)
    if (query.postalCode) params.set('postalCode', query.postalCode)

    const url = `${this.baseUrl}/resolve?${params.toString()}`
    const res = await fetch(url)

    if (res.status === 404) return null
    if (!res.ok) {
      throw new Error(`Region API error: ${res.status} ${res.statusText}`)
    }

    return (await res.json()) as RegionApiResponse
  }
}
