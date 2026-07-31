import { BiteshipProvider } from '@ongkir-sdk/biteship'
import type { ShippingProvider } from '@ongkir-sdk/core'
import { createShippingRoutes } from '@ongkir-sdk/hono'
import { KomerceProvider } from '@ongkir-sdk/komerce'
import { Hono } from 'hono'

const providers: Record<string, ShippingProvider> = {}

if (process.env.BITESHIP_API_KEY) {
  providers.biteship = new BiteshipProvider({ apiKey: process.env.BITESHIP_API_KEY })
}
if (process.env.RAJAONGKIR_API_KEY) {
  providers.komerce = new KomerceProvider({ apiKey: process.env.RAJAONGKIR_API_KEY })
}

const providerNames = Object.keys(providers)
if (providerNames.length === 0) {
  console.error('Set minimal satu API key: BITESHIP_API_KEY atau RAJAONGKIR_API_KEY')
  process.exit(1)
}

const app = new Hono()
app.route('/', createShippingRoutes({ providers, defaultProvider: process.env.DEFAULT_PROVIDER }))

console.log(`Provider terdaftar: ${providerNames.join(', ')}`)
console.log(`Server jalan di port ${process.env.PORT ?? 3000}`)

export default app
