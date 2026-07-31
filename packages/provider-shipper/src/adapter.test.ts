import { describe, expect, it } from 'bun:test'
import { type ShippingSDKError, isShippingSDKError } from '@ongkir-sdk/core'
import { runProviderContractTests } from '@ongkir-sdk/core/testing'
import createOrderFixture from './__fixtures__/create-order-response.json'
import locationFixture from './__fixtures__/location-search-response.json'
import orderDetailFixture from './__fixtures__/order-detail-response.json'
import pricingFixture from './__fixtures__/pricing-domestic-response.json'
import { ShipperProvider } from './adapter'
import type { ShipperProviderConfig } from './adapter'

function createMockClient(): NonNullable<ShipperProviderConfig['httpClient']> {
  return async (url: string, init?: RequestInit) => {
    if (url.includes('/v3/location') && init?.method === 'GET') {
      const keyword = new URL(url).searchParams.get('keyword') ?? ''
      const entries = locationFixture.data.filter((entry: { postcodes?: string[] }) =>
        entry.postcodes?.includes(keyword),
      )

      if (entries.length === 0) {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ data: entries }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/v3/pricing/domestic') && init?.method === 'POST') {
      return new Response(JSON.stringify(pricingFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/v3/order') && init?.method === 'POST') {
      return new Response(JSON.stringify(createOrderFixture), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.includes('/v3/order/')) {
      const id = url.split('/').pop()
      if (id === 'INVALID_TRACKING_ID_12345') {
        return new Response(
          JSON.stringify({
            metadata: {
              http_status_code: 404,
              http_status: 'Not Found',
              errors: [{ code: 404, message: 'Order not found' }],
            },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        )
      }

      return new Response(JSON.stringify(orderDetailFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({}), { status: 404, headers: { 'Content-Type': 'application/json' } })
  }
}

describe('ShipperProvider', () => {
  const mockClient = createMockClient()

  describe('getRates', () => {
    it('should resolve area ids and return normalized rates', async () => {
      const provider = new ShipperProvider({
        apiKey: 'test_key',
        httpClient: mockClient,
      })

      const rates = await provider.getRates({
        origin: { postalCode: '10110' },
        destination: { postalCode: '40111' },
        items: [{ weightGrams: 1000 }],
      })

      expect(rates).toHaveLength(2)
      expect(rates[0]).toMatchObject({
        provider: 'JNE',
        service: 'REG',
        cost: 9000,
        currency: 'IDR',
        estimatedDaysMin: 2,
        estimatedDaysMax: 3,
      })
    })

    it('should cache resolved area ids across calls', async () => {
      let locationCalls = 0
      const baseClient = createMockClient()
      const countingClient: NonNullable<ShipperProviderConfig['httpClient']> = async (
        url: string,
        init?: RequestInit,
      ) => {
        if (url.includes('/v3/location')) {
          locationCalls += 1
        }
        return baseClient(url, init)
      }

      const provider = new ShipperProvider({ apiKey: 'test_key', httpClient: countingClient })

      const request = {
        origin: { postalCode: '10110' },
        destination: { postalCode: '40111' },
        items: [{ weightGrams: 1000 }],
      }

      await provider.getRates(request)
      await provider.getRates(request)

      expect(locationCalls).toBe(2)
    })

    it('should throw INVALID_ORIGIN when postal code is missing', async () => {
      const provider = new ShipperProvider({ apiKey: 'test_key', httpClient: mockClient })

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

    it('should throw INVALID_ORIGIN when area cannot be resolved', async () => {
      const provider = new ShipperProvider({ apiKey: 'test_key', httpClient: mockClient })

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
    it('should return normalized tracking from order detail', async () => {
      const provider = new ShipperProvider({ apiKey: 'test_key', httpClient: mockClient })

      const result = await provider.trackShipment('215VKK6KQYEX2')
      expect(result.provider).toBe('shipper')
      expect(result.trackingId).toBe('215VKK6KQYEX2')
      expect(result.status).toBe('Paket Terkirim')
      expect(result.statusHistory).toHaveLength(3)
    })
  })

  describe('parseWebhook', () => {
    it('should parse status webhook without signature verification', () => {
      const provider = new ShipperProvider({ apiKey: 'test_key', httpClient: mockClient })

      const event = provider.parseWebhook(
        {
          order_id: 'ORDER-1',
          order_tracking_id: 'TRACK-1',
          status_date: '2021-05-27T09:43:21+00:00',
          external_status: { code: 2000, name: 'Paket Terkirim' },
        },
        new Headers({ 'content-type': 'application/json' }),
      )

      expect(event.provider).toBe('shipper')
      expect(event.trackingId).toBe('TRACK-1')
      expect(event.status).toBe('Paket Terkirim')
      expect(event.normalizedStatus).toBe('delivered')
    })
  })

  describe('createShipment', () => {
    it('should re-query pricing, resolve rate id, and create order', async () => {
      let pricingCalls = 0
      const baseClient = createMockClient()
      const countingClient: NonNullable<ShipperProviderConfig['httpClient']> = async (
        url: string,
        init?: RequestInit,
      ) => {
        if (url.includes('/v3/pricing/domestic')) {
          pricingCalls += 1
        }
        return baseClient(url, init)
      }

      const provider = new ShipperProvider({ apiKey: 'test_key', httpClient: countingClient })

      const result = await provider.createShipment({
        origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '12440' },
        destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
        items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
        courier: 'jne',
        service: 'reg',
      })

      expect(pricingCalls).toBe(1)
      expect(result.provider).toBe('shipper')
      expect(result.orderId).toBe('215MX47DYNRV5')
      expect(result.service).toBe('reg')
      expect(result.cost).toBe(9000)
    })

    it('should throw RATE_NOT_AVAILABLE when no rate matches courier/service', async () => {
      const provider = new ShipperProvider({ apiKey: 'test_key', httpClient: mockClient })

      try {
        await provider.createShipment({
          origin: {
            name: 'Toko Sumber',
            phone: '081234567890',
            address: 'Jl. Raya Sudirman No. 1',
            postalCode: '12440',
          },
          destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
          items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
          courier: 'jne',
          service: 'oke',
        })
        expect.unreachable('Expected an error to be thrown')
      } catch (err) {
        expect(isShippingSDKError(err)).toBe(true)
        expect((err as ShippingSDKError).code).toBe('RATE_NOT_AVAILABLE')
      }
    })
  })
})

runProviderContractTests({
  createProvider: () =>
    new ShipperProvider({
      apiKey: 'mock_key',
      httpClient: createMockClient(),
    }),
  validTrackingId: '215VKK6KQYEX2',
  supportsSignatureVerification: false,
  supportsCreateShipment: true,
})
