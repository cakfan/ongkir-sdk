import { describe, expect, it } from 'bun:test'
import { ShippingSDKError } from '@ongkir-sdk/core'
import { handleShipperError } from './errors'

describe('handleShipperError', () => {
  it('should throw normalized ShippingSDKError with provider error code', async () => {
    const response = new Response(
      JSON.stringify({
        metadata: {
          http_status_code: 400,
          http_status: 'Bad Request',
          errors: [{ code: 810, message: 'Invalid rate_id' }],
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )

    try {
      await handleShipperError(response, 'shipper', 'CREATE_SHIPMENT_FAILED')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ShippingSDKError)
      const sdkError = err as ShippingSDKError
      expect(sdkError.code).toBe('CREATE_SHIPMENT_FAILED')
      expect(sdkError.provider).toBe('shipper')
      expect(sdkError.providerErrorCode).toBe('810')
      expect(sdkError.retryable).toBe(false)
    }
  })

  it('should map auth failures', async () => {
    const response = new Response(JSON.stringify({}), { status: 401 })

    try {
      await handleShipperError(response, 'shipper', 'RATE_NOT_AVAILABLE')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      expect((err as ShippingSDKError).code).toBe('PROVIDER_AUTH_FAILED')
    }
  })

  it('should map 404 to tracking not found only for tracking context', async () => {
    const notFound = new Response(
      JSON.stringify({ metadata: { errors: [{ code: 404, message: 'Order not found' }] } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )

    try {
      await handleShipperError(notFound, 'shipper', 'TRACKING_NOT_FOUND')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      expect((err as ShippingSDKError).code).toBe('TRACKING_NOT_FOUND')
    }

    const otherNotFound = new Response(
      JSON.stringify({ metadata: { errors: [{ code: 404, message: 'Area not found' }] } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )

    try {
      await handleShipperError(otherNotFound, 'shipper', 'INVALID_ORIGIN')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      expect((err as ShippingSDKError).code).toBe('INVALID_ORIGIN')
    }
  })

  it('should mark 5xx and 429 as retryable', async () => {
    const response = new Response(JSON.stringify({}), { status: 500 })

    try {
      await handleShipperError(response, 'shipper', 'RATE_NOT_AVAILABLE')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      expect((err as ShippingSDKError).retryable).toBe(true)
    }
  })

  it('should fall back to HTTP status text when body is not json', async () => {
    const response = new Response('boom', { status: 502 })

    try {
      await handleShipperError(response, 'shipper', 'RATE_NOT_AVAILABLE')
      expect.unreachable('Expected an error to be thrown')
    } catch (err) {
      const sdkError = err as ShippingSDKError
      expect(sdkError.code).toBe('PROVIDER_UNAVAILABLE')
      expect(sdkError.message).toContain('502')
    }
  })
})
