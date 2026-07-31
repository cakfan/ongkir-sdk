import { describe, expect, it } from 'bun:test'
import {
  findRateId,
  getPostalCode,
  toCoreRateResults,
  toCoreShipmentResult,
  toCoreTrackingResult,
  toCoreWebhookEvent,
  toShipmentStatus,
  toShipperAreaId,
  toShipperCreateOrderRequest,
  toShipperPricingRequest,
} from './mapper'
import type {
  ShipperCreateOrderResponse,
  ShipperOrderDetailResponse,
  ShipperPricingResponse,
  ShipperWebhookPayload,
} from './mapper'

describe('mapper', () => {
  describe('getPostalCode', () => {
    it('returns trimmed postal code from a postal-only ref', () => {
      expect(getPostalCode({ postalCode: ' 10110 ' })).toBe('10110')
    })

    it('returns undefined when postal code is absent', () => {
      expect(getPostalCode({ provinceCode: '11', cityCode: '31', districtCode: '1010' })).toBeUndefined()
    })
  })

  describe('toShipperAreaId', () => {
    it('matches the entry whose postcode equals the search postal code', () => {
      const entries = [
        { adm_level_5: { id: 4711, postcode: '10110' }, postcodes: ['10110'] },
        { adm_level_5: { id: 4892, postcode: '40111' }, postcodes: ['40111'] },
      ]
      expect(toShipperAreaId(entries, '40111')).toBe(4892)
    })

    it('matches via the postcodes array when adm_level_5 is missing', () => {
      const entries = [{ postcodes: ['12240'] }]
      expect(toShipperAreaId(entries, '12240')).toBeUndefined()
      expect(toShipperAreaId([{ adm_level_5: { id: 4872 }, postcodes: ['12240'] }], '12240')).toBe(4872)
    })

    it('returns undefined when nothing matches', () => {
      expect(toShipperAreaId([{ adm_level_5: { id: 4711, postcode: '10110' } }], '99999')).toBeUndefined()
      expect(toShipperAreaId(null, '10110')).toBeUndefined()
    })
  })

  describe('toShipperPricingRequest', () => {
    it('aggregates items into a single package payload', () => {
      const body = toShipperPricingRequest(
        {
          origin: { postalCode: '10110' },
          destination: { postalCode: '40111' },
          items: [{ weightGrams: 1000, lengthCm: 10, widthCm: 20, heightCm: 5, value: 50000, quantity: 2 }],
        },
        4711,
        4892,
      )

      expect(body.origin).toEqual({ area_id: 4711 })
      expect(body.destination).toEqual({ area_id: 4892 })
      expect(body.weight).toBe(2)
      expect(body.item_value).toBe(100000)
      expect(body.length).toBe(10)
      expect(body.width).toBe(20)
      expect(body.height).toBe(5)
      expect(body.for_order).toBe(true)
      expect(body.cod).toBe(false)
    })

    it('includes lat/lng when provided', () => {
      const body = toShipperPricingRequest(
        {
          origin: { provinceCode: '11', cityCode: '31', districtCode: '1010', lat: -6.2, lng: 106.8 },
          destination: { postalCode: '40111' },
          items: [{ weightGrams: 1000 }],
        },
        4711,
        4892,
      )
      expect(body.origin).toEqual({ area_id: 4711, lat: '-6.2', lng: '106.8' })
    })
  })

  describe('toCoreRateResults', () => {
    const response: ShipperPricingResponse = {
      data: {
        pricings: [
          {
            logistic: { code: 'JNE', name: 'JNE' },
            rate: { id: 58, name: 'REG', description: 'Regular Package' },
            min_day: 2,
            max_day: 3,
            final_price: 9000,
            currency: 'IDR',
          },
          {
            logistic: { code: 'SCP', name: 'SiCepat' },
            rate: { id: 365, name: 'Regular' },
            min_day: 1,
            max_day: 2,
            final_price: 11500,
            currency: 'IDR',
            insurance_applied: true,
            insurance_fee: 500,
          },
        ],
      },
    }

    it('maps pricings to normalized RateResult', () => {
      const rates = toCoreRateResults(response)
      expect(rates).toHaveLength(2)
      expect(rates[0]).toMatchObject({
        provider: 'JNE',
        service: 'REG',
        description: 'Regular Package',
        cost: 9000,
        currency: 'IDR',
        estimatedDaysMin: 2,
        estimatedDaysMax: 3,
      })
      expect(rates[1]?.additionalServices).toEqual([{ name: 'insurance', cost: 500 }])
    })

    it('handles empty pricings', () => {
      expect(toCoreRateResults({ data: { pricings: [] } })).toEqual([])
    })
  })

  describe('findRateId', () => {
    const response: ShipperPricingResponse = {
      data: {
        pricings: [
          { logistic: { code: 'JNE' }, rate: { id: 58, name: 'REG' } },
          { logistic: { code: 'SCP' }, rate: { id: 365, name: 'Regular' } },
        ],
      },
    }

    it('matches courier + service case-insensitively', () => {
      expect(findRateId(response, 'jne', 'reg')).toBe(58)
      expect(findRateId(response, 'scp', 'regular')).toBe(365)
    })

    it('returns undefined when no rate matches', () => {
      expect(findRateId(response, 'jne', 'oke')).toBeUndefined()
    })
  })

  describe('toShipperCreateOrderRequest', () => {
    it('builds the create order payload with normalized phone numbers', () => {
      const request = {
        origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '12440' },
        destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
        items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
        courier: 'jne',
        service: 'reg',
        referenceId: 'INV-001',
      }

      const body = toShipperCreateOrderRequest(request, 4871, 4872, 58)

      expect(body.consigner).toEqual({ name: 'Toko Sumber', phone_number: '6281234567890' })
      expect(body.consignee).toEqual({ name: 'Budi', phone_number: '6281298765432' })
      expect(body.courier).toEqual({ cod: false, rate_id: 58, use_insurance: false })
      expect(body.coverage).toBe('domestic')
      expect(body.destination).toEqual({ address: 'Jl. Merdeka No. 2', area_id: 4872 })
      expect(body.origin).toEqual({ address: 'Jl. Raya Sudirman No. 1', area_id: 4871 })
      expect(body.external_id).toBe('INV-001')
      expect(body.package).toMatchObject({
        weight: 1,
        length: 1,
        width: 1,
        height: 1,
        price: 50000,
        items: [{ name: 'Kaos Polos', price: 50000, qty: 1 }],
      })
      expect(body.payment_type).toBe('postpay')
    })

    it('sets cod true and omits external_id when absent', () => {
      const body = toShipperCreateOrderRequest(
        {
          origin: { name: 'A', phone: '0811', address: 'addr1', postalCode: '12440' },
          destination: { name: 'B', phone: '0822', address: 'addr2', postalCode: '12240' },
          items: [{ name: 'Item', weightGrams: 500 }],
          courier: 'jne',
          service: 'reg',
          cashOnDelivery: { amount: 50000 },
        },
        4871,
        4872,
        58,
      )
      expect(body.courier.cod).toBe(true)
      expect('external_id' in body).toBe(false)
    })
  })

  describe('toCoreShipmentResult', () => {
    it('maps create order response to ShipmentResult', () => {
      const response: ShipperCreateOrderResponse = {
        data: { order_id: '215MX47DYNRV5', courier: { amount: 9000 } },
      }
      expect(toCoreShipmentResult(response, 'reg')).toMatchObject({
        provider: 'shipper',
        orderId: '215MX47DYNRV5',
        trackingId: '215MX47DYNRV5',
        service: 'reg',
        status: 'created',
        normalizedStatus: 'confirmed',
        cost: 9000,
        currency: 'IDR',
      })
    })
  })

  describe('toCoreTrackingResult', () => {
    it('maps order detail to TrackingResult', () => {
      const response: ShipperOrderDetailResponse = {
        data: {
          order_id: '215VKK6KQYEX2',
          awb_number: '010116222971811',
          shipment_status: { name: 'Paket Terkirim', code: 2000 },
          origin: { address: 'Jalan Kenangan' },
          destination: { address: 'Jalan Kenangan' },
          package: { weight: 1.1231 },
          trackings: [
            {
              shipper_status: { name: 'Paket sedang dipersiapkan', description: 'Paket sedang dipersiapkan' },
              created_date: '2021-05-28T08:16:21Z',
            },
            {
              shipper_status: { name: 'Paket Terkirim', description: 'Paket sudah diterima' },
              created_date: '2021-05-29T08:00:00Z',
            },
          ],
        },
      }

      const result = toCoreTrackingResult(response, '215VKK6KQYEX2')
      expect(result.provider).toBe('shipper')
      expect(result.status).toBe('Paket Terkirim')
      expect(result.statusHistory).toHaveLength(2)
      expect(result.statusHistory[0]).toMatchObject({
        status: 'Paket sedang dipersiapkan',
        timestamp: '2021-05-28T08:16:21Z',
        description: 'Paket sedang dipersiapkan',
      })
      expect(result.weight).toBe(1.1231)
    })

    it('returns empty result when data is null', () => {
      const result = toCoreTrackingResult({ data: null }, 'ID')
      expect(result).toEqual({ provider: 'shipper', trackingId: 'ID', status: 'unknown', statusHistory: [] })
    })
  })

  describe('toShipmentStatus', () => {
    it('maps Shipper status codes to normalized status', () => {
      expect(toShipmentStatus(999)).toBe('cancelled')
      expect(toShipmentStatus(1000)).toBe('confirmed')
      expect(toShipmentStatus(1010)).toBe('pickup')
      expect(toShipmentStatus(1050)).toBe('in_transit')
      expect(toShipmentStatus(1190)).toBe('in_transit')
      expect(toShipmentStatus(2000)).toBe('delivered')
      expect(toShipmentStatus(2010)).toBe('delivered')
      expect(toShipmentStatus(3000)).toBe('delivered')
      expect(toShipmentStatus(undefined)).toBe('unknown')
    })
  })

  describe('toCoreWebhookEvent', () => {
    it('maps webhook payload to WebhookEvent', () => {
      const payload: ShipperWebhookPayload = {
        order_id: '60af69a2d48465d30e2b5b85',
        order_tracking_id: '60af69b98f62b9082bdfebf9',
        status_date: '2021-05-27T09:43:21+00:00',
        awb: '010116222971811',
        external_status: { code: 2000, name: 'Paket Terkirim', description: 'Paket Terkirim' },
      }

      const event = toCoreWebhookEvent(payload)
      expect(event.provider).toBe('shipper')
      expect(event.trackingId).toBe('60af69b98f62b9082bdfebf9')
      expect(event.status).toBe('Paket Terkirim')
      expect(event.normalizedStatus).toBe('delivered')
      expect(event.timestamp).toBe('2021-05-27T09:43:21+00:00')
      expect(typeof event.id).toBe('string')
    })

    it('falls back to order_id when tracking id is missing', () => {
      const event = toCoreWebhookEvent({ order_id: 'ORDER-1', status_date: '2021-01-01T00:00:00Z' })
      expect(event.trackingId).toBe('ORDER-1')
      expect(event.status).toBe('unknown')
    })
  })
})
