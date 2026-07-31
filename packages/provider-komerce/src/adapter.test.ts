import { describe, expect, it } from 'bun:test'
import { type ShippingSDKError, isShippingSDKError } from '@ongkir-sdk/core'
import { runProviderContractTests } from '@ongkir-sdk/core/testing'
import searchFixture from './__fixtures__/destination-search-response.json'
import ratesFixture from './__fixtures__/rates-response.json'
import trackingFixture from './__fixtures__/tracking-response.json'
import { KomerceProvider } from './adapter'
import type { KomerceProviderConfig } from './adapter'

function createMockClient(): NonNullable<KomerceProviderConfig['httpClient']> {
  return async (url: string, init?: RequestInit) => {
    if (url.includes('/destination/domestic-destination')) {
      const search = new URL(url).searchParams.get('search')
      if (search === '00000') {
        return new Response(
          JSON.stringify({
            meta: { message: 'Domestic Destinations Data not found', code: 404, status: 'error' },
            data: null,
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify(searchFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/calculate/domestic-cost') && init?.method === 'POST') {
      return new Response(JSON.stringify(ratesFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/track/waybill')) {
      const awb = new URL(url).searchParams.get('awb')
      if (awb === 'INVALID_TRACKING_ID_12345') {
        return new Response(
          JSON.stringify({ meta: { message: 'Checking AWB not found', code: 404, status: 'error' }, data: null }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify(trackingFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ meta: { message: 'Not found', code: 404, status: 'error' }, data: null }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

describe('KomerceProvider', () => {
  const mockClient = createMockClient()

  describe('getRates', () => {
    it('should resolve region ids and return normalized rates', async () => {
      const provider = new KomerceProvider({
        apiKey: 'test_key',
        httpClient: mockClient,
      })

      const rates = await provider.getRates({
        origin: { postalCode: '10110' },
        destination: { postalCode: '40111' },
        items: [{ weightGrams: 1000 }],
      })

      expect(rates).toHaveLength(4)
      expect(rates[0]?.provider).toBe('jne')
      expect(rates[0]?.service).toBe('reg')
      expect(rates[0]?.cost).toBe(20000)
      expect(rates[0]?.currency).toBe('IDR')
    })

    it('should cache resolved region ids across calls', async () => {
      let searchCalls = 0
      const baseClient = createMockClient()
      const countingClient: NonNullable<KomerceProviderConfig['httpClient']> = async (
        url: string,
        init?: RequestInit,
      ) => {
        if (url.includes('/destination/domestic-destination')) {
          searchCalls += 1
        }
        return baseClient(url, init)
      }

      const provider = new KomerceProvider({ apiKey: 'test_key', httpClient: countingClient })

      await provider.getRates({
        origin: { postalCode: '10110' },
        destination: { postalCode: '40111' },
        items: [{ weightGrams: 1000 }],
      })
      await provider.getRates({
        origin: { postalCode: '10110' },
        destination: { postalCode: '40111' },
        items: [{ weightGrams: 1000 }],
      })

      expect(searchCalls).toBe(2)
    })

    it('should throw INVALID_ORIGIN when postal code is missing', async () => {
      const provider = new KomerceProvider({ apiKey: 'test_key', httpClient: mockClient })

      try {
        await provider.getRates({
          origin: { provinceCode: '11', cityCode: '31', districtCode: '1010' },
          destination: { postalCode: '40111' },
          items: [{ weightGrams: 1000 }],
        })
        expect.unreachable('Expected an error to be thrown')
      } catch (err) {
        expect(isShippingSDKError(err)).toBe(true)
        expect((err as ShippingSDKError).code).toBe('INVALID_ORIGIN')
      }
    })

    it('should throw INVALID_ORIGIN when region cannot be resolved', async () => {
      const provider = new KomerceProvider({ apiKey: 'test_key', httpClient: mockClient })

      try {
        await provider.getRates({
          origin: { postalCode: '00000' },
          destination: { postalCode: '40111' },
          items: [{ weightGrams: 1000 }],
        })
        expect.unreachable('Expected an error to be thrown')
      } catch (err) {
        expect((err as ShippingSDKError).code).toBe('INVALID_ORIGIN')
      }
    })
  })

  describe('trackShipment', () => {
    it('should return normalized tracking with courier', async () => {
      const provider = new KomerceProvider({ apiKey: 'test_key', httpClient: mockClient })

      const result = await provider.trackShipment('JNE001234567890', { courier: 'jne' })
      expect(result.provider).toBe('komerce')
      expect(result.trackingId).toBe('JNE001234567890')
      expect(result.status).toBe('DELIVERED')
      expect(result.statusHistory).toHaveLength(3)
    })

    it('should throw ShippingSDKError when courier is missing', async () => {
      const provider = new KomerceProvider({ apiKey: 'test_key', httpClient: mockClient })

      try {
        await provider.trackShipment('JNE001234567890')
        expect.unreachable('Expected an error to be thrown')
      } catch (err) {
        expect(isShippingSDKError(err)).toBe(true)
        expect((err as ShippingSDKError).providerErrorCode).toBe('MISSING_COURIER')
      }
    })
  })

  describe('parseWebhook', () => {
    it('should throw WEBHOOK_NOT_SUPPORTED', () => {
      const provider = new KomerceProvider({ apiKey: 'test_key', httpClient: mockClient })

      expect(() => provider.parseWebhook({}, new Headers())).toThrow()
      try {
        provider.parseWebhook({}, new Headers())
      } catch (err) {
        expect((err as ShippingSDKError).code).toBe('WEBHOOK_NOT_SUPPORTED')
      }
    })
  })

  describe('createShipment', () => {
    it('should throw CREATE_SHIPMENT_NOT_SUPPORTED', async () => {
      const provider = new KomerceProvider({ apiKey: 'test_key', httpClient: mockClient })

      try {
        await provider.createShipment({
          origin: { name: 'A', phone: '1', address: 'addr' },
          destination: { name: 'B', phone: '2', address: 'addr' },
          items: [{ name: 'Item', weightGrams: 500 }],
          courier: 'jne',
          service: 'reg',
        })
        expect.unreachable('Expected an error to be thrown')
      } catch (err) {
        expect(isShippingSDKError(err)).toBe(true)
        expect((err as ShippingSDKError).code).toBe('CREATE_SHIPMENT_NOT_SUPPORTED')
      }
    })
  })
})

runProviderContractTests({
  createProvider: () =>
    new KomerceProvider({
      apiKey: 'mock_key',
      httpClient: createMockClient(),
    }),
  validTrackingId: 'JNE001234567890',
  supportsSignatureVerification: false,
  supportsWebhooks: false,
  supportsCreateShipment: false,
})
