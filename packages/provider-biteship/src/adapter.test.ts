import { describe, expect, it } from 'bun:test'
import { type ShippingSDKError, isShippingSDKError } from '@ongkir-sdk/core'
import { runProviderContractTests } from '@ongkir-sdk/core/testing'
import createOrderFixture from './__fixtures__/create-order-response.json'
import ratesFixture from './__fixtures__/rates-response.json'
import trackingFixture from './__fixtures__/tracking-response.json'
import { BiteshipProvider } from './adapter'
import type { BiteshipProviderConfig } from './adapter'

function createMockClient(): BiteshipProviderConfig['httpClient'] {
  return async (url: string, init?: RequestInit) => {
    if (url.includes('/v1/rates/couriers') && init?.method === 'POST' && init.body) {
      const body = JSON.parse(init.body as string) as Record<string, unknown>

      if (
        ((body.origin_postal_code as number) === 0 || body.origin_postal_code === undefined) &&
        body.origin_area_id === undefined
      ) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid origin', code: '40001001' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const invalidPostalCodes = [0]
      if (invalidPostalCodes.includes(body.destination_postal_code as number)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid destination', code: '40001001' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(ratesFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/v1/trackings/')) {
      const id = url.split('/').pop()
      if (id === 'INVALID_TRACKING_ID_12345') {
        return new Response(JSON.stringify({ success: false, error: 'Tracking not found', code: '40003001' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(trackingFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/v1/orders') && init?.method === 'POST' && init.body) {
      const body = JSON.parse(init.body as string) as Record<string, unknown>
      const dest = (body.destination as Record<string, unknown>) ?? {}

      if (dest.postal_code === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid destination', code: '40001002' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify(createOrderFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: false }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

describe('BiteshipProvider', () => {
  const mockClient = createMockClient()

  describe('getRates', () => {
    it('should return normalized rates', async () => {
      const provider = new BiteshipProvider({
        apiKey: 'test_key',
        httpClient: mockClient,
      })

      const rates = await provider.getRates({
        origin: { postalCode: '12440' },
        destination: { postalCode: '12240' },
        items: [{ weightGrams: 200 }],
      })

      expect(rates).toHaveLength(2)
      expect(rates[0]?.provider).toBe('jne')
      expect(rates[0]?.cost).toBe(11000)
    })
  })

  describe('trackShipment', () => {
    it('should return normalized tracking', async () => {
      const provider = new BiteshipProvider({
        apiKey: 'test_key',
        httpClient: mockClient,
      })

      const result = await provider.trackShipment('6051861741a37414e6637fab')
      expect(result.status).toBe('delivered')
      expect(result.statusHistory).toHaveLength(6)
    })
  })

  describe('createShipment', () => {
    it('should create order and return normalized ShipmentResult', async () => {
      const provider = new BiteshipProvider({
        apiKey: 'test_key',
        httpClient: mockClient,
      })

      const result = await provider.createShipment({
        origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '12440' },
        destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
        items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
        courier: 'jne',
        service: 'reg',
      })

      expect(result.provider).toBe('biteship')
      expect(result.orderId).toBe('5dd599ebdefcd4158eb8470b')
      expect(result.awb).toBe('WYB-1112223333443')
      expect(result.trackingId).toBe('65ddac3879699035b83dc561')
      expect(result.service).toBe('reg')
      expect(result.status).toBe('confirmed')
      expect(result.normalizedStatus).toBe('confirmed')
      expect(result.cost).toBe(11000)
      expect(result.currency).toBe('IDR')
    })

    it('should throw ShippingSDKError for invalid destination', async () => {
      const provider = new BiteshipProvider({
        apiKey: 'test_key',
        httpClient: mockClient,
      })

      try {
        await provider.createShipment({
          origin: {
            name: 'Toko Sumber',
            phone: '081234567890',
            address: 'Jl. Raya Sudirman No. 1',
            postalCode: '12440',
          },
          destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '00000' },
          items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
          courier: 'jne',
          service: 'reg',
        })
        expect.unreachable('Expected an error to be thrown')
      } catch (err) {
        expect(isShippingSDKError(err)).toBe(true)
        expect((err as ShippingSDKError).code).toBe('INVALID_DESTINATION')
      }
    })
  })
})

runProviderContractTests({
  createProvider: () =>
    new BiteshipProvider({
      apiKey: 'mock_key',
      httpClient: createMockClient(),
    }),
  validTrackingId: '6051861741a37414e6637fab',
  supportsSignatureVerification: false,
  supportsCreateShipment: true,
})
