import { describe, expect, it } from 'bun:test'
import type { RateRequest } from '@ongkir-sdk/core'
import searchFixture from './__fixtures__/destination-search-response.json'
import ratesFixture from './__fixtures__/rates-response.json'
import trackingFixture from './__fixtures__/tracking-response.json'
import { getPostalCode, pickDestinationId, toCoreRateResults, toCoreTrackingResult, toKomerceRateBody } from './mapper'
import type { KomerceTrackingResponse } from './mapper'

describe('getPostalCode', () => {
  it('should extract postal code from postalCode shorthand', () => {
    expect(getPostalCode({ postalCode: '10110' })).toBe('10110')
  })

  it('should extract postal code from RegionRef', () => {
    expect(getPostalCode({ provinceCode: '11', cityCode: '31', districtCode: '1010', postalCode: '10110' })).toBe(
      '10110',
    )
  })

  it('should return undefined when postal code is missing', () => {
    expect(getPostalCode({ provinceCode: '11', cityCode: '31', districtCode: '1010' })).toBeUndefined()
    expect(getPostalCode({ postalCode: '' })).toBeUndefined()
  })
})

describe('toKomerceRateBody', () => {
  const baseRequest: RateRequest = {
    origin: { postalCode: '10110' },
    destination: { postalCode: '40111' },
    items: [{ weightGrams: 1000 }],
  }

  it('should build form fields with resolved ids and total weight', () => {
    const body = toKomerceRateBody(baseRequest, 66914, 68520)
    expect(body.origin).toBe('66914')
    expect(body.destination).toBe('68520')
    expect(body.weight).toBe('1000')
    expect(body.price).toBe('lowest')
  })

  it('should join couriers with colon separator', () => {
    const body = toKomerceRateBody(baseRequest, 1, 2)
    expect(body.courier?.startsWith('jne:sicepat:')).toBe(true)
    expect(body.courier?.split(':')).toContain('jnt')
  })

  it('should sum weights across items including quantity', () => {
    const body = toKomerceRateBody(
      {
        ...baseRequest,
        items: [
          { weightGrams: 200, quantity: 2 },
          { weightGrams: 150, quantity: 1 },
        ],
      },
      1,
      2,
    )
    expect(body.weight).toBe('550')
  })
})

describe('toCoreRateResults', () => {
  it('should normalize rate items', () => {
    const rates = toCoreRateResults(ratesFixture)
    expect(rates).toHaveLength(4)

    const jne = rates[0]
    expect(jne?.provider).toBe('jne')
    expect(jne?.service).toBe('reg')
    expect(jne?.cost).toBe(20000)
    expect(jne?.currency).toBe('IDR')
    expect(jne?.estimatedDaysMin).toBe(1)
    expect(jne?.estimatedDaysMax).toBe(2)
  })

  it('should parse single-day ETD as min equals max', () => {
    const rates = toCoreRateResults(ratesFixture)
    const yes = rates[1]
    expect(yes?.estimatedDaysMin).toBe(1)
    expect(yes?.estimatedDaysMax).toBe(1)
  })

  it('should return empty array when data is null', () => {
    expect(toCoreRateResults({ meta: { code: 400 }, data: null })).toEqual([])
  })
})

describe('toCoreTrackingResult', () => {
  it('should normalize tracking summary and manifest', () => {
    const result = toCoreTrackingResult(trackingFixture as unknown as KomerceTrackingResponse, 'JNE001234567890')

    expect(result.provider).toBe('komerce')
    expect(result.trackingId).toBe('JNE001234567890')
    expect(result.status).toBe('DELIVERED')
    expect(result.statusHistory).toHaveLength(3)
    expect(result.statusHistory[0]).toMatchObject({
      status: 'Paket diterima kurir di lokasi pengirim',
      timestamp: '2026-07-20 15:10:00',
      location: 'JAKARTA PUSAT',
    })
    expect(result.origin).toBe('KOTA JAKARTA PUSAT')
    expect(result.destination).toBe('KOTA BANDUNG')
    expect(result.weight).toBe(1000)
  })

  it('should fall back to passed tracking id when waybill number is missing', () => {
    const result = toCoreTrackingResult(
      {
        meta: { code: 200 },
        data: {
          delivered: true,
          summary: { courier_code: 'jne', courier_name: 'JNE', waybill_number: '', status: 'DELIVERED' },
          manifest: [],
        },
      } as unknown as KomerceTrackingResponse,
      'FALLBACK_ID',
    )
    expect(result.trackingId).toBe('FALLBACK_ID')
    expect(result.statusHistory).toEqual([])
  })
})

describe('pickDestinationId', () => {
  it('should prefer exact zip code match', () => {
    const data = searchFixture.data
    expect(pickDestinationId(data, '10110')).toBe(66914)
  })

  it('should fall back to first result when no exact zip match', () => {
    expect(pickDestinationId(searchFixture.data, '99999')).toBe(66914)
  })

  it('should return undefined for empty data', () => {
    expect(pickDestinationId(null, '10110')).toBeUndefined()
    expect(pickDestinationId([], '10110')).toBeUndefined()
  })
})
