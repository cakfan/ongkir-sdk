import { describe, expect, it } from 'bun:test'
import { type ShippingProvider, ShippingSDKError } from '@ongkir-sdk/core'
import { createShippingRoutes } from './middleware'

function fakeProvider(name: string): ShippingProvider {
  return {
    async getRates() {
      return [
        { provider: name, service: 'reg', cost: 10000, currency: 'IDR', estimatedDaysMin: 1, estimatedDaysMax: 2 },
      ]
    },
    async trackShipment(trackingId) {
      return {
        provider: name,
        trackingId,
        status: 'delivered',
        statusHistory: [{ status: 'delivered', timestamp: '2026-07-31T00:00:00Z' }],
      }
    },
    parseWebhook(payload) {
      return {
        id: 'evt_1',
        provider: name,
        type: 'status.update',
        trackingId: 'AWB001',
        status: 'delivered',
        timestamp: '2026-07-31T00:00:00Z',
        rawPayload: payload,
      }
    },
  }
}

function throwingProvider(name: string, code: ShippingSDKError['code'], retryable = false): ShippingProvider {
  return {
    async getRates() {
      throw new ShippingSDKError({ code, provider: name, message: `gagal: ${code}`, retryable })
    },
    async trackShipment() {
      throw new ShippingSDKError({ code, provider: name, message: `gagal: ${code}`, retryable })
    },
    parseWebhook() {
      throw new ShippingSDKError({ code, provider: name, message: `gagal: ${code}`, retryable })
    },
  }
}

describe('createShippingRoutes', () => {
  it('GET /rates -> 200 dengan RateResult[] ternormalisasi', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/rates?origin=12440&destination=12240&weight=1000')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({ provider: 'biteship', service: 'reg', cost: 10000, currency: 'IDR' })
  })

  it('GET /rates -> 400 VALIDATION_ERROR kalau query tidak valid', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/rates?origin=12440&destination=12240')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('GET /rates -> 400 VALIDATION_ERROR kalau weight bukan angka', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/rates?origin=12440&destination=12240&weight=abc')
    expect(res.status).toBe(400)
  })

  it('GET /rates pakai defaultProvider dari map multi-provider', async () => {
    const app = createShippingRoutes({
      providers: { biteship: fakeProvider('biteship'), komerce: fakeProvider('komerce') },
      defaultProvider: 'komerce',
    })
    const res = await app.request('/rates?origin=12440&destination=12240&weight=1000')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].provider).toBe('komerce')
  })

  it('GET /rates -> 500 kalau multi-provider tanpa defaultProvider', async () => {
    const app = createShippingRoutes({
      providers: { biteship: fakeProvider('biteship'), komerce: fakeProvider('komerce') },
    })
    const res = await app.request('/rates?origin=12440&destination=12240&weight=1000')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error.code).toBe('UNKNOWN')
  })

  it('GET /track/:id -> 200 TrackingResult ternormalisasi', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/track/AWB001')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ provider: 'biteship', trackingId: 'AWB001', status: 'delivered' })
  })

  it('GET /track/:id?courier=jne meneruskan courier ke provider', async () => {
    const tracked: { courier?: string } = {}
    const provider: ShippingProvider = {
      ...fakeProvider('komerce'),
      async trackShipment(trackingId, options) {
        tracked.courier = options?.courier
        return fakeProvider('komerce').trackShipment(trackingId)
      },
    }
    const app = createShippingRoutes({ providers: { komerce: provider } })
    const res = await app.request('/track/AWB001?courier=jne')
    expect(res.status).toBe(200)
    expect(tracked.courier).toBe('jne')
  })

  it('POST /webhooks/:provider -> 200 dengan event ternormalisasi', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/webhooks/biteship', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'x', status: 'delivered' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.event).toMatchObject({ provider: 'biteship', trackingId: 'AWB001' })
  })

  it('POST /webhooks/:provider -> 404 kalau provider tidak terdaftar', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/webhooks/komerce', { method: 'POST', body: '{}' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('PROVIDER_NOT_FOUND')
  })

  it('POST /webhooks/:provider -> 400 kalau body bukan JSON valid', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/webhooks/biteship', { method: 'POST', body: 'bukan-json' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('error provider -> HTTP status sesuai mapping error code', async () => {
    const cases: Array<[ShippingSDKError['code'], number]> = [
      ['INVALID_ORIGIN', 422],
      ['INVALID_DESTINATION', 422],
      ['RATE_NOT_AVAILABLE', 422],
      ['TRACKING_NOT_FOUND', 404],
      ['PROVIDER_AUTH_FAILED', 401],
      ['PROVIDER_RATE_LIMITED', 429],
      ['PROVIDER_UNAVAILABLE', 502],
      ['WEBHOOK_SIGNATURE_INVALID', 401],
      ['WEBHOOK_NOT_SUPPORTED', 501],
      ['UNKNOWN', 500],
    ]
    for (const [code, expected] of cases) {
      const app = createShippingRoutes({
        providers: { x: throwingProvider('x', code, code === 'PROVIDER_UNAVAILABLE') },
      })
      const res = await app.request('/rates?origin=12440&destination=12240&weight=1000')
      const body = await res.json()
      expect(res.status, code).toBe(expected)
      expect(body.error.code).toBe(code)
      expect(typeof body.error.retryable).toBe('boolean')
    }
  })

  it('route tidak dikenal -> 404 JSON', async () => {
    const app = createShippingRoutes({ providers: { biteship: fakeProvider('biteship') } })
    const res = await app.request('/nope')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
