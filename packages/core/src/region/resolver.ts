import type { RegionRef } from '../types'
import { RegionApiClient, type RegionApiQuery } from './client'

type CacheBackend = Map<string, RegionRef>

export interface RegionResolverConfig {
  baseUrl?: string
  cache?: CacheBackend | 'memory' | false
  ttlMs?: number
}

export class RegionResolver {
  private client: RegionApiClient
  private cache: CacheBackend | null
  private ttlMs: number

  constructor(config: RegionResolverConfig = {}) {
    this.client = new RegionApiClient(config.baseUrl)
    if (config.cache === false) {
      this.cache = null
    } else if (config.cache === 'memory' || config.cache === undefined) {
      this.cache = new Map()
    } else {
      this.cache = config.cache
    }
    this.ttlMs = config.ttlMs ?? 86_400_000
  }

  async resolve(query: RegionApiQuery): Promise<RegionRef> {
    const cacheKey = this.cacheKey(query)

    if (this.cache) {
      const cached = this.cache.get(cacheKey)
      if (cached) return cached
    }

    const result = await this.client.resolve(query)

    if (!result) {
      throw new RegionNotFoundError(query)
    }

    const ref: RegionRef = {
      provinceCode: result.provinceCode,
      cityCode: result.cityCode,
      districtCode: result.districtCode,
      postalCode: result.postalCode,
      lat: result.lat,
      lng: result.lng,
    }

    if (this.cache) {
      this.cache.set(cacheKey, ref)
      setTimeout(() => this.cache?.delete(cacheKey), this.ttlMs)
    }

    return ref
  }

  private cacheKey(query: RegionApiQuery): string {
    return JSON.stringify(query)
  }
}

export class RegionNotFoundError extends Error {
  public readonly query: RegionApiQuery

  constructor(query: RegionApiQuery) {
    super(`Region not found: ${JSON.stringify(query)}`)
    this.name = 'RegionNotFoundError'
    this.query = query
  }
}
