import { describe, expect, it } from 'bun:test'
import ratesFixture from './__fixtures__/rates-response.json'
import trackingFixture from './__fixtures__/tracking-response.json'
import webhookFixture from './__fixtures__/webhook-payload.json'
import { toBiteshipRateRequest, toCoreRateResults, toCoreTrackingResult, toCoreWebhookEvent } from './mapper'

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
    expect(result.rawPayload).toEqual(webhookFixture)
  })
})
