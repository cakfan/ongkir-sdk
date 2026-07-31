import { describe, expect, it } from 'bun:test'
import createOrderFixture from './__fixtures__/create-order-response.json'
import ratesFixture from './__fixtures__/rates-response.json'
import trackingFixture from './__fixtures__/tracking-response.json'
import webhookFixture from './__fixtures__/webhook-payload.json'
import {
  toBiteshipCreateOrderRequest,
  toBiteshipRateRequest,
  toCoreRateResults,
  toCoreShipmentResult,
  toCoreTrackingResult,
  toCoreWebhookEvent,
  toShipmentStatus,
} from './mapper'

describe('toBiteshipRateRequest', () => {
  it('should convert core RateRequest to Biteship format', () => {
    const result = toBiteshipRateRequest({
      origin: { postalCode: '12440' },
      destination: { postalCode: '12240' },
      items: [{ weightGrams: 200, value: 199000, lengthCm: 30, widthCm: 15, heightCm: 20, quantity: 2 }],
    })

    expect(result.origin_postal_code).toBe(12440)
    expect(result.destination_postal_code).toBe(12240)
    expect(result.couriers).toBeTruthy()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.weight).toBe(200)
    expect(result.items[0]?.value).toBe(199000)
    expect(result.items[0]?.quantity).toBe(2)
    expect(result.items[0]?.length).toBe(30)
  })

  it('should handle minimal items without dimensions', () => {
    const result = toBiteshipRateRequest({
      origin: { postalCode: '10110' },
      destination: { postalCode: '40111' },
      items: [{ weightGrams: 1000 }],
    })

    expect(result.items[0]?.weight).toBe(1000)
    expect(result.items[0]?.length).toBeUndefined()
    expect(result.items[0]?.quantity).toBe(1)
  })
})

describe('toCoreRateResults', () => {
  it('should normalize Biteship pricing to RateResult[]', () => {
    const results = toCoreRateResults(ratesFixture as any)

    expect(results).toHaveLength(2)

    expect(results[0]?.provider).toBe('jne')
    expect(results[0]?.service).toBe('ctc')
    expect(results[0]?.description).toBe('Pengiriman city to city')
    expect(results[0]?.cost).toBe(11000)
    expect(results[0]?.currency).toBe('IDR')
    expect(results[0]?.estimatedDaysMin).toBe(2)
    expect(results[0]?.estimatedDaysMax).toBe(3)

    expect(results[1]?.additionalServices).toHaveLength(2)
    expect(results[1]?.additionalServices?.[0]?.name).toBe('insurance')
    expect(results[1]?.additionalServices?.[1]?.name).toBe('cash_on_delivery')
  })
})

describe('toCoreTrackingResult', () => {
  it('should normalize Biteship tracking to TrackingResult', () => {
    const result = toCoreTrackingResult(trackingFixture as any)

    expect(result.provider).toBe('biteship')
    expect(result.trackingId).toBe('6051861741a37414e6637fab')
    expect(result.status).toBe('delivered')
    expect(result.statusHistory).toHaveLength(6)
    expect(result.statusHistory[0]?.status).toBe('confirmed')
    expect(result.statusHistory[0]?.timestamp).toBe('2021-03-16T18:17:00+07:00')
  })
})

describe('toCoreWebhookEvent', () => {
  it('should normalize Biteship webhook to WebhookEvent', () => {
    const headers = new Headers({ 'content-type': 'application/json' })
    const result = toCoreWebhookEvent(webhookFixture as any, headers)

    expect(result.provider).toBe('biteship')
    expect(result.type).toBe('order.status')
    expect(result.trackingId).toBe('XYZ-123-PQS')
    expect(result.status).toBe('confirmed')
    expect(result.normalizedStatus).toBe('confirmed')
    expect(result.rawPayload).toEqual(webhookFixture)
  })
})

describe('toBiteshipCreateOrderRequest', () => {
  it('should convert core CreateShipmentRequest to Biteship order format', () => {
    const result = toBiteshipCreateOrderRequest({
      origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '12440' },
      destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
      items: [
        { name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1, lengthCm: 10, widthCm: 10, heightCm: 10 },
      ],
      courier: 'jne',
      service: 'reg',
      referenceId: 'INV-2026-0001',
      note: 'Hati-hati',
    })

    expect(result.origin.contact_name).toBe('Toko Sumber')
    expect(result.origin.postal_code).toBe(12440)
    expect(result.destination.contact_name).toBe('Budi')
    expect(result.destination.postal_code).toBe(12240)
    expect(result.courier).toEqual({ company: 'jne', type: 'reg' })
    expect(result.reference_id).toBe('INV-2026-0001')
    expect(result.note).toBe('Hati-hati')
    expect(result.items[0]).toMatchObject({ name: 'Kaos Polos', value: 50000, weight: 1000, length: 10 })
    expect(result.destination.cash_on_delivery).toBeUndefined()
  })

  it('should omit optional fields when not provided', () => {
    const result = toBiteshipCreateOrderRequest({
      origin: { name: 'A', phone: '1', address: 'addr' },
      destination: { name: 'B', phone: '2', address: 'addr' },
      items: [{ name: 'Item', weightGrams: 500 }],
      courier: 'jne',
      service: 'reg',
    })

    expect(result.origin.postal_code).toBeUndefined()
    expect(result.reference_id).toBeUndefined()
    expect(result.note).toBeUndefined()
    expect(result.items[0]).toMatchObject({ value: 0, quantity: 1 })
  })

  it('should include cash on delivery when provided', () => {
    const result = toBiteshipCreateOrderRequest({
      origin: { name: 'A', phone: '1', address: 'addr' },
      destination: { name: 'B', phone: '2', address: 'addr' },
      items: [{ name: 'Item', weightGrams: 500 }],
      courier: 'jne',
      service: 'reg',
      cashOnDelivery: { amount: 150000 },
    })

    expect(result.destination.cash_on_delivery).toEqual({ amount: 150000 })
  })
})

describe('toCoreShipmentResult', () => {
  it('should normalize Biteship create order response to ShipmentResult', () => {
    const result = toCoreShipmentResult(createOrderFixture as any)

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

  it('should map unknown status to unknown', () => {
    const result = toCoreShipmentResult({ success: true, id: 'x' })
    expect(result.status).toBe('unknown')
    expect(result.normalizedStatus).toBe('unknown')
    expect(result.cost).toBe(0)
  })
})

describe('toShipmentStatus', () => {
  it('should map Biteship statuses to ShipmentStatus', () => {
    expect(toShipmentStatus('confirmed')).toBe('confirmed')
    expect(toShipmentStatus('allocated')).toBe('pickup')
    expect(toShipmentStatus('picked')).toBe('pickup')
    expect(toShipmentStatus('delivering')).toBe('in_transit')
    expect(toShipmentStatus('delivered')).toBe('delivered')
    expect(toShipmentStatus('cancelled')).toBe('cancelled')
    expect(toShipmentStatus('something-else')).toBe('unknown')
    expect(toShipmentStatus(undefined)).toBe('unknown')
  })
})
