import { describe, expect, it } from 'bun:test'
import { ShippingSDKError } from '@ongkir-sdk/core'
import { handleKomerceError, toKomerceErrorCode } from './errors'
import type { KomerceMeta } from './mapper'

describe('toKomerceErrorCode', () => {
  const meta = (code: number, message: string): KomerceMeta => ({ code, message, status: 'error' })

  it('should map auth failures', () => {
    expect(toKomerceErrorCode(401)).toBe('PROVIDER_AUTH_FAILED')
    expect(toKomerceErrorCode(403)).toBe('PROVIDER_AUTH_FAILED')
    expect(toKomerceErrorCode(200, meta(401, 'Unauthorized'))).toBe('PROVIDER_AUTH_FAILED')
  })

  it('should map rate limiting', () => {
    expect(toKomerceErrorCode(429)).toBe('PROVIDER_RATE_LIMITED')
  })

  it('should map server errors to unavailable', () => {
    expect(toKomerceErrorCode(500)).toBe('PROVIDER_UNAVAILABLE')
    expect(toKomerceErrorCode(503)).toBe('PROVIDER_UNAVAILABLE')
  })

  it('should map 404 awb to tracking not found', () => {
    expect(toKomerceErrorCode(404, meta(404, 'Checking AWB not found'))).toBe('TRACKING_NOT_FOUND')
  })

  it('should map 404 destination to invalid destination', () => {
    expect(toKomerceErrorCode(404, meta(404, 'Domestic Destinations Data not found'))).toBe('INVALID_DESTINATION')
  })

  it('should map 400 no-rate to rate not available', () => {
    expect(toKomerceErrorCode(400, meta(400, 'Calculate Domestic Shipping Cost not found'))).toBe('RATE_NOT_AVAILABLE')
  })

  it('should map 400 missing params to unknown', () => {
    expect(toKomerceErrorCode(400, meta(400, 'Missing Params'))).toBe('UNKNOWN')
  })

  it('should map 422 invalid courier to unknown', () => {
    expect(toKomerceErrorCode(422, meta(422, 'Invalid Courier'))).toBe('UNKNOWN')
  })
})

describe('handleKomerceError', () => {
  it('should throw normalized ShippingSDKError with provider error code', async () => {
    const response = new Response(
      JSON.stringify({ meta: { message: 'Checking AWB not found', code: 404, status: 'error' }, data: null }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )

    try {
      await handleKomerceError(response, 'komerce')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ShippingSDKError)
      const sdkError = err as ShippingSDKError
      expect(sdkError.code).toBe('TRACKING_NOT_FOUND')
      expect(sdkError.provider).toBe('komerce')
      expect(sdkError.providerErrorCode).toBe('404')
      expect(sdkError.retryable).toBe(false)
    }
  })

  it('should mark 5xx and 429 as retryable', async () => {
    const response = new Response(JSON.stringify({}), { status: 500 })

    try {
      await handleKomerceError(response, 'komerce')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      expect((err as ShippingSDKError).retryable).toBe(true)
    }
  })

  it('should fall back to HTTP status text when body is not json', async () => {
    const response = new Response('boom', { status: 502 })

    try {
      await handleKomerceError(response, 'komerce')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      const sdkError = err as ShippingSDKError
      expect(sdkError.code).toBe('PROVIDER_UNAVAILABLE')
      expect(sdkError.message).toContain('502')
    }
  })
})
