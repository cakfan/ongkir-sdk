import { ShippingSDKError } from '@ongkir-sdk/core'

const RATES_ERROR_MAP: Record<string, string> = {
  '40001001': 'INVALID_ORIGIN',
  '40001002': 'INVALID_DESTINATION',
  '40001010': 'RATE_NOT_AVAILABLE',
}

const TRACKING_ERROR_MAP: Record<string, string> = {
  '40003001': 'TRACKING_NOT_FOUND',
  '40003002': 'TRACKING_NOT_FOUND',
}

const ORDER_ERROR_MAP: Record<string, string> = {
  '40002001': 'PROVIDER_AUTH_FAILED',
  '40002041': 'CREATE_SHIPMENT_FAILED',
  '40002059': 'CREATE_SHIPMENT_FAILED',
  '40002060': 'CREATE_SHIPMENT_FAILED',
}

function getErrorCode(httpStatus: number, bodyCode?: string): string {
  if (bodyCode) {
    return RATES_ERROR_MAP[bodyCode] ?? TRACKING_ERROR_MAP[bodyCode] ?? ORDER_ERROR_MAP[bodyCode] ?? 'UNKNOWN'
  }

  switch (httpStatus) {
    case 401:
    case 403:
      return 'PROVIDER_AUTH_FAILED'
    case 404:
      return 'TRACKING_NOT_FOUND'
    case 429:
      return 'PROVIDER_RATE_LIMITED'
    case 500:
    case 502:
    case 503:
      return 'PROVIDER_UNAVAILABLE'
    default:
      return 'UNKNOWN'
  }
}

export async function handleBiteshipError(response: Response, provider: string): Promise<never> {
  let body: { error?: string; code?: string } | undefined
  try {
    body = (await response.json()) as { error?: string; code?: string }
  } catch {
    // ignore parse error
  }

  const code = body?.code
  const shippingCode = getErrorCode(response.status, code)
  const message = body?.error ?? `HTTP ${response.status}: ${response.statusText}`
  const retryable = response.status >= 500 || response.status === 429

  throw new ShippingSDKError({
    code: shippingCode as ShippingSDKError['code'],
    provider,
    message,
    providerErrorCode: code,
    retryable,
    cause: body,
  })
}
