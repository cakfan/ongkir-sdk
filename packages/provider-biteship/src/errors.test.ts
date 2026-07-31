import { describe, expect, it } from 'bun:test'
import { isShippingSDKError } from '@ongkir-sdk/core'
import { handleBiteshipError } from './errors'

describe('handleBiteshipError', () => {
  it('should map 401 to PROVIDER_AUTH_FAILED', async () => {
    const err = await catchError(401, { success: false, error: 'Unauthorized' })
    expect(isShippingSDKError(err)).toBe(true)
    expect(err.code).toBe('PROVIDER_AUTH_FAILED')
    expect(err.retryable).toBe(false)
  })

  it('should map 404 to TRACKING_NOT_FOUND', async () => {
    const err = await catchError(404, { success: false, error: 'Not found' })
    expect(err.code).toBe('TRACKING_NOT_FOUND')
  })

  it('should map 429 to PROVIDER_RATE_LIMITED (retryable)', async () => {
    const err = await catchError(429, { success: false, error: 'Too many requests' })
    expect(err.code).toBe('PROVIDER_RATE_LIMITED')
    expect(err.retryable).toBe(true)
  })

  it('should map 500 to PROVIDER_UNAVAILABLE (retryable)', async () => {
    const err = await catchError(500, { success: false, error: 'Internal error' })
    expect(err.code).toBe('PROVIDER_UNAVAILABLE')
    expect(err.retryable).toBe(true)
  })

  it('should map known Biteship code 40001001 to INVALID_ORIGIN', async () => {
    const err = await catchError(400, { success: false, error: 'Invalid postal', code: '40001001' })
    expect(err.code).toBe('INVALID_ORIGIN')
    expect(err.providerErrorCode).toBe('40001001')
  })

  it('should map known Biteship code 40001010 to RATE_NOT_AVAILABLE', async () => {
    const err = await catchError(400, { success: false, error: 'No courier', code: '40001010' })
    expect(err.code).toBe('RATE_NOT_AVAILABLE')
  })

  it('should map 400 WITHOUT code to UNKNOWN, not guess INVALID_DESTINATION', async () => {
    const err = await catchError(400, { success: false, error: 'No sufficient balance to call rates API' })
    expect(err.code).toBe('UNKNOWN')
    expect(err.message).toContain('balance')
  })

  it('should keep provider error code and cause for audit', async () => {
    const body = { success: false, error: 'boom', code: '40003001' }
    const err = await catchError(400, body)
    expect(err.provider).toBe('biteship')
    expect(err.providerErrorCode).toBe('40003001')
    expect(err.cause).toEqual(body)
  })
})

async function catchError(status: number, body: object): Promise<import('@ongkir-sdk/core').ShippingSDKError> {
  const res = new Response(JSON.stringify(body), { status })
  try {
    await handleBiteshipError(res, 'biteship')
  } catch (err) {
    return err as import('@ongkir-sdk/core').ShippingSDKError
  }
  throw new Error('expected handleBiteshipError to throw')
}
