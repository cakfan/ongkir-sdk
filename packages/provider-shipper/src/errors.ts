import { ShippingSDKError } from '@ongkir-sdk/core'

interface ShipperErrorBody {
  metadata?: {
    errors?: Array<{ code?: number | string; message?: string }>
  }
}

function getErrorCode(httpStatus: number, defaultCode: string): string {
  switch (httpStatus) {
    case 401:
    case 403:
      return 'PROVIDER_AUTH_FAILED'
    case 429:
      return 'PROVIDER_RATE_LIMITED'
    case 500:
    case 502:
    case 503:
      return 'PROVIDER_UNAVAILABLE'
    case 404:
      return defaultCode === 'TRACKING_NOT_FOUND' ? 'TRACKING_NOT_FOUND' : defaultCode
    default:
      return defaultCode
  }
}

export async function handleShipperError(response: Response, provider: string, defaultCode: string): Promise<never> {
  let body: ShipperErrorBody | undefined
  try {
    body = (await response.json()) as ShipperErrorBody
  } catch {
    // ignore parse error
  }

  const error = body?.metadata?.errors?.[0]
  const code = error?.code !== undefined ? String(error.code) : undefined
  const shippingCode = getErrorCode(response.status, defaultCode)
  const message = error?.message ?? `HTTP ${response.status}: ${response.statusText}`
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
