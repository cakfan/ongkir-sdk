export const SHIPPING_ERROR_CODES = [
  'INVALID_ORIGIN',
  'INVALID_DESTINATION',
  'RATE_NOT_AVAILABLE',
  'TRACKING_NOT_FOUND',
  'PROVIDER_AUTH_FAILED',
  'PROVIDER_RATE_LIMITED',
  'PROVIDER_UNAVAILABLE',
  'WEBHOOK_SIGNATURE_INVALID',
  'WEBHOOK_NOT_SUPPORTED',
  'UNKNOWN',
] as const

export type ShippingErrorCode = (typeof SHIPPING_ERROR_CODES)[number]

export class ShippingSDKError extends Error {
  public readonly code: ShippingErrorCode
  public readonly provider: string
  public readonly providerErrorCode?: string
  public readonly retryable: boolean
  public override readonly cause?: unknown

  constructor(opts: {
    code: ShippingErrorCode
    provider: string
    message: string
    providerErrorCode?: string
    retryable?: boolean
    cause?: unknown
  }) {
    super(opts.message)
    this.name = 'ShippingSDKError'
    this.code = opts.code
    this.provider = opts.provider
    this.providerErrorCode = opts.providerErrorCode
    this.retryable = opts.retryable ?? false
    this.cause = opts.cause
  }
}

export function isRetryable(error: unknown): boolean {
  return error instanceof ShippingSDKError && error.retryable
}

export function isShippingSDKError(error: unknown): error is ShippingSDKError {
  return error instanceof ShippingSDKError
}
