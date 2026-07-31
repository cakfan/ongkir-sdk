import { ShippingSDKError } from '@ongkir-sdk/core'
import type { ShippingErrorCode } from '@ongkir-sdk/core'
import type { KomerceMeta } from './mapper'

export function toKomerceErrorCode(httpStatus: number, meta?: KomerceMeta): ShippingErrorCode {
  const msg = meta?.message?.toLowerCase() ?? ''
  const bodyCode = meta?.code

  if (bodyCode === 401 || httpStatus === 401 || httpStatus === 403) {
    return 'PROVIDER_AUTH_FAILED'
  }
  if (bodyCode === 429 || httpStatus === 429) {
    return 'PROVIDER_RATE_LIMITED'
  }
  if (httpStatus >= 500) {
    return 'PROVIDER_UNAVAILABLE'
  }
  if (bodyCode === 404 || httpStatus === 404) {
    if (/destination/i.test(msg)) return 'INVALID_DESTINATION'
    return 'TRACKING_NOT_FOUND'
  }
  if (bodyCode === 400 || httpStatus === 400) {
    if (/shipping cost not found|not found/i.test(msg)) return 'RATE_NOT_AVAILABLE'
    return 'UNKNOWN'
  }
  if (bodyCode === 422 || httpStatus === 422) {
    return 'UNKNOWN'
  }
  return 'UNKNOWN'
}

export async function handleKomerceError(response: Response, provider: string): Promise<never> {
  let meta: KomerceMeta | undefined
  try {
    const body = (await response.json()) as { meta?: KomerceMeta }
    meta = body.meta
  } catch {
    // ignore parse error
  }

  const code = toKomerceErrorCode(response.status, meta)
  const message = meta?.message ?? `HTTP ${response.status}: ${response.statusText}`
  const retryable = response.status >= 500 || response.status === 429

  throw new ShippingSDKError({
    code,
    provider,
    message,
    providerErrorCode: meta?.code != null ? String(meta.code) : undefined,
    retryable,
    cause: meta,
  })
}
