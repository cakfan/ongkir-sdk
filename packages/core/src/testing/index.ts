import { describe, expect, it } from 'bun:test'
import type { ShippingProvider } from '../contract'
import { isShippingSDKError } from '../errors'
import type { CreateShipmentRequest } from '../types'

export interface ContractTestConfig {
  createProvider: () => ShippingProvider
  validTrackingId: string
  supportsSignatureVerification?: boolean
  supportsWebhooks?: boolean
  supportsCreateShipment?: boolean
}

export function sampleCreateShipmentRequest(): CreateShipmentRequest {
  return {
    origin: {
      name: 'Toko Sumber',
      phone: '081234567890',
      address: 'Jl. Raya Sudirman No. 1',
      postalCode: '12440',
    },
    destination: {
      name: 'Budi',
      phone: '081298765432',
      address: 'Jl. Merdeka No. 2',
      postalCode: '12240',
    },
    items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
    courier: 'jne',
    service: 'reg',
  }
}

export function runProviderContractTests(config: ContractTestConfig) {
  describe('ShippingProvider contract', () => {
    const provider = config.createProvider()

    describe('getRates', () => {
      it('should return an array of RateResult', async () => {
        const rates = await provider.getRates({
          origin: { postalCode: '10110' },
          destination: { postalCode: '40111' },
          items: [{ weightGrams: 1000 }],
        })

        expect(Array.isArray(rates)).toBe(true)
        for (const rate of rates) {
          expect(typeof rate.provider).toBe('string')
          expect(typeof rate.service).toBe('string')
          expect(typeof rate.cost).toBe('number')
          expect(typeof rate.currency).toBe('string')
        }
      })

      it('should throw ShippingSDKError for invalid origin', async () => {
        try {
          await provider.getRates({
            origin: { postalCode: '00000' },
            destination: { postalCode: '40111' },
            items: [{ weightGrams: 1000 }],
          })
          expect.unreachable('Expected an error to be thrown')
        } catch (err) {
          expect(isShippingSDKError(err)).toBe(true)
        }
      })

      it('should throw ShippingSDKError for invalid destination', async () => {
        try {
          await provider.getRates({
            origin: { postalCode: '10110' },
            destination: { postalCode: '00000' },
            items: [{ weightGrams: 1000 }],
          })
          expect.unreachable('Expected an error to be thrown')
        } catch (err) {
          expect(isShippingSDKError(err)).toBe(true)
        }
      })
    })

    describe('trackShipment', () => {
      it('should return TrackingResult for valid tracking ID', async () => {
        const result = await provider.trackShipment(config.validTrackingId, { courier: 'jne' })

        expect(typeof result.provider).toBe('string')
        expect(typeof result.trackingId).toBe('string')
        expect(typeof result.status).toBe('string')
        expect(Array.isArray(result.statusHistory)).toBe(true)
      })

      it('should throw ShippingSDKError for invalid tracking ID', async () => {
        try {
          await provider.trackShipment('INVALID_TRACKING_ID_12345')
          expect.unreachable('Expected an error to be thrown')
        } catch (err) {
          expect(isShippingSDKError(err)).toBe(true)
        }
      })
    })

    describe('parseWebhook', () => {
      const webhookTest = config.supportsWebhooks !== false ? it : it.skip

      webhookTest('should return WebhookEvent for valid payload', () => {
        const event = provider.parseWebhook(
          { id: 'evt_1', status: 'delivered' },
          new Headers({ 'content-type': 'application/json' }),
        )

        expect(typeof event.id).toBe('string')
        expect(typeof event.provider).toBe('string')
        expect(typeof event.type).toBe('string')
        expect(typeof event.trackingId).toBe('string')
        expect(typeof event.status).toBe('string')
        expect(typeof event.timestamp).toBe('string')
      })

      const sigTest = config.supportsSignatureVerification !== false ? it : it.skip

      sigTest('should throw ShippingSDKError for invalid signature', () => {
        const headers = new Headers({
          'x-signature': 'invalid',
          'content-type': 'application/json',
        })

        expect(() => {
          provider.parseWebhook({ id: 'evt_1' }, headers)
        }).toThrow()
      })
    })

    describe('createShipment', () => {
      const createTest = config.supportsCreateShipment !== false ? it : it.skip

      createTest('should return ShipmentResult for valid request', async () => {
        const result = await provider.createShipment(sampleCreateShipmentRequest())

        expect(typeof result.provider).toBe('string')
        expect(typeof result.orderId).toBe('string')
        expect(typeof result.service).toBe('string')
        expect(typeof result.status).toBe('string')
        expect(typeof result.cost).toBe('number')
        expect(typeof result.currency).toBe('string')
      })

      it('should throw ShippingSDKError for invalid request', async () => {
        try {
          await provider.createShipment({
            ...sampleCreateShipmentRequest(),
            destination: { ...sampleCreateShipmentRequest().destination, postalCode: '00000' },
          })
          expect.unreachable('Expected an error to be thrown')
        } catch (err) {
          expect(isShippingSDKError(err)).toBe(true)
        }
      })
    })
  })
}

declare global {
  namespace Bun {
    function unreachable(message?: string): never
  }
}
