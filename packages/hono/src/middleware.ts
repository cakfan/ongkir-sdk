import { type ShippingProvider, ShippingSDKError, isShippingSDKError } from '@ongkir-sdk/core'
import { type Context, Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod'

export interface ShippingRoutesOptions {
  /** Map nama provider (slug di URL, misal "biteship") → instance adapter. */
  providers: Record<string, ShippingProvider>
  /** Provider yang dipakai route /rates dan /track/:id. Wajib kalau mount > 1 provider. */
  defaultProvider?: string
}

const HTTP_STATUS_BY_ERROR_CODE: Record<string, ContentfulStatusCode> = {
  INVALID_ORIGIN: 422,
  INVALID_DESTINATION: 422,
  RATE_NOT_AVAILABLE: 422,
  TRACKING_NOT_FOUND: 404,
  PROVIDER_AUTH_FAILED: 401,
  PROVIDER_RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 502,
  WEBHOOK_SIGNATURE_INVALID: 401,
  WEBHOOK_NOT_SUPPORTED: 501,
  CREATE_SHIPMENT_NOT_SUPPORTED: 501,
  CREATE_SHIPMENT_FAILED: 502,
  UNKNOWN: 500,
}

const ratesQuerySchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  weight: z.coerce.number().positive(),
  length: z.coerce.number().positive().optional(),
  width: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  value: z.coerce.number().nonnegative().optional(),
})

const trackQuerySchema = z.object({
  courier: z.string().min(1).optional(),
})

const contactSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().min(1),
  postalCode: z.string().optional(),
})

const shipmentItemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  value: z.number().nonnegative().optional(),
  quantity: z.number().int().positive().optional(),
  weightGrams: z.number().positive(),
  lengthCm: z.number().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
})

const createShipmentBodySchema = z.object({
  origin: contactSchema,
  destination: contactSchema,
  items: z.array(shipmentItemSchema).min(1),
  courier: z.string().min(1),
  service: z.string().min(1),
  referenceId: z.string().min(1).optional(),
  note: z.string().optional(),
  cashOnDelivery: z.object({ amount: z.number().nonnegative() }).optional(),
})

function validationError(c: Context, message: string, issues: unknown) {
  return c.json({ error: { code: 'VALIDATION_ERROR', message, issues } }, 400)
}

function resolveDefaultProvider(options: ShippingRoutesOptions): ShippingProvider {
  if (options.defaultProvider) {
    const provider = options.providers[options.defaultProvider]
    if (provider) return provider
    throw new ShippingSDKError({
      code: 'UNKNOWN',
      provider: 'hono',
      message: `defaultProvider "${options.defaultProvider}" tidak terdaftar di map providers`,
    })
  }
  const names = Object.keys(options.providers)
  if (names.length === 1) {
    const [name] = names
    const onlyProvider = name ? options.providers[name] : undefined
    if (onlyProvider) return onlyProvider
  }
  throw new ShippingSDKError({
    code: 'UNKNOWN',
    provider: 'hono',
    message: 'defaultProvider wajib diset kalau mount lebih dari satu provider',
  })
}

export function createShippingRoutes(options: ShippingRoutesOptions): Hono {
  const app = new Hono()

  app.onError((err, c) => {
    if (isShippingSDKError(err)) {
      const status = HTTP_STATUS_BY_ERROR_CODE[err.code] ?? 500
      return c.json(
        {
          error: {
            code: err.code,
            message: err.message,
            provider: err.provider,
            providerErrorCode: err.providerErrorCode,
            retryable: err.retryable,
          },
        },
        status,
      )
    }
    console.error('[ongkir-sdk] unhandled error:', err)
    return c.json({ error: { code: 'UNKNOWN', message: 'Internal server error' } }, 500)
  })

  app.notFound((c) =>
    c.json({ error: { code: 'NOT_FOUND', message: `Route tidak ditemukan: ${c.req.method} ${c.req.path}` } }, 404),
  )

  app.get('/rates', async (c) => {
    const parsed = ratesQuerySchema.safeParse(c.req.query())
    if (!parsed.success) {
      return validationError(c, 'Query params tidak valid', parsed.error.issues)
    }

    const q = parsed.data
    const provider = resolveDefaultProvider(options)
    const rates = await provider.getRates({
      origin: { postalCode: q.origin },
      destination: { postalCode: q.destination },
      items: [
        {
          weightGrams: q.weight,
          lengthCm: q.length,
          widthCm: q.width,
          heightCm: q.height,
          quantity: q.quantity ?? 1,
          value: q.value,
        },
      ],
    })
    return c.json(rates)
  })

  app.get('/track/:id', async (c) => {
    const parsed = trackQuerySchema.safeParse(c.req.query())
    if (!parsed.success) {
      return validationError(c, 'Query params tidak valid', parsed.error.issues)
    }

    const provider = resolveDefaultProvider(options)
    const result = await provider.trackShipment(
      c.req.param('id'),
      parsed.data.courier ? { courier: parsed.data.courier } : undefined,
    )
    return c.json(result)
  })

  app.post('/shipments', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Body harus JSON valid' } }, 400)
    }

    const parsed = createShipmentBodySchema.safeParse(body)
    if (!parsed.success) {
      return validationError(c, 'Body tidak valid', parsed.error.issues)
    }

    const provider = resolveDefaultProvider(options)
    const result = await provider.createShipment(parsed.data)
    return c.json(result, 201)
  })

  app.post('/webhooks/:provider', async (c) => {
    const providerName = c.req.param('provider')
    const provider = options.providers[providerName]
    if (!provider) {
      return c.json(
        {
          error: { code: 'PROVIDER_NOT_FOUND', message: `Tidak ada provider terdaftar dengan nama "${providerName}"` },
        },
        404,
      )
    }

    let payload: unknown
    try {
      payload = await c.req.json()
    } catch {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Body harus JSON valid' } }, 400)
    }

    const event = provider.parseWebhook(payload, c.req.raw.headers)
    return c.json({ ok: true, event })
  })

  return app
}
