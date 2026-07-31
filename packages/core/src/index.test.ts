import { describe, expect, it } from 'bun:test'
import { SHIPPING_ERROR_CODES, ShippingSDKError, isRetryable, isShippingSDKError } from './errors'

describe('ShippingSDKError', () => {
  it('should create error with correct properties', () => {
    const err = new ShippingSDKError({
      code: 'INVALID_ORIGIN',
      provider: 'biteship',
      message: 'Origin not found',
      providerErrorCode: 'ERR_001',
      retryable: false,
    })

    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ShippingSDKError')
    expect(err.code).toBe('INVALID_ORIGIN')
    expect(err.provider).toBe('biteship')
    expect(err.message).toBe('Origin not found')
    expect(err.providerErrorCode).toBe('ERR_001')
    expect(err.retryable).toBe(false)
  })

  it('should default retryable to false', () => {
    const err = new ShippingSDKError({
      code: 'UNKNOWN',
      provider: 'test',
      message: 'test',
    })
    expect(err.retryable).toBe(false)
  })
})

describe('isRetryable', () => {
  it('should return true for retryable errors', () => {
    const err = new ShippingSDKError({
      code: 'PROVIDER_RATE_LIMITED',
      provider: 'test',
      message: 'rate limited',
      retryable: true,
    })
    expect(isRetryable(err)).toBe(true)
  })

  it('should return false for non-ShippingSDKError', () => {
    expect(isRetryable(new Error('generic'))).toBe(false)
  })
})

describe('isShippingSDKError', () => {
  it('should return true for ShippingSDKError', () => {
    const err = new ShippingSDKError({
      code: 'UNKNOWN',
      provider: 'test',
      message: 'test',
    })
    expect(isShippingSDKError(err)).toBe(true)
  })

  it('should return false for generic Error', () => {
    expect(isShippingSDKError(new Error('generic'))).toBe(false)
  })
})

describe('SHIPPING_ERROR_CODES', () => {
  it('should include all error codes', () => {
    expect(SHIPPING_ERROR_CODES).toContain('INVALID_ORIGIN')
    expect(SHIPPING_ERROR_CODES).toContain('INVALID_DESTINATION')
    expect(SHIPPING_ERROR_CODES).toContain('RATE_NOT_AVAILABLE')
    expect(SHIPPING_ERROR_CODES).toContain('TRACKING_NOT_FOUND')
    expect(SHIPPING_ERROR_CODES).toContain('PROVIDER_AUTH_FAILED')
    expect(SHIPPING_ERROR_CODES).toContain('PROVIDER_RATE_LIMITED')
    expect(SHIPPING_ERROR_CODES).toContain('PROVIDER_UNAVAILABLE')
    expect(SHIPPING_ERROR_CODES).toContain('WEBHOOK_SIGNATURE_INVALID')
    expect(SHIPPING_ERROR_CODES).toContain('CREATE_SHIPMENT_NOT_SUPPORTED')
    expect(SHIPPING_ERROR_CODES).toContain('CREATE_SHIPMENT_FAILED')
    expect(SHIPPING_ERROR_CODES).toContain('UNKNOWN')
  })
})
