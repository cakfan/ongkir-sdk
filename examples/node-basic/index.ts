import { BiteshipProvider } from '@ongkir-sdk/biteship'
import { type ShippingProvider, isShippingSDKError } from '@ongkir-sdk/core'
import { KomerceProvider } from '@ongkir-sdk/komerce'
import { ShipperProvider } from '@ongkir-sdk/shipper'

const providerName = process.env.PROVIDER ?? 'biteship'
const apiKeyConfig: Record<string, { env: string; hint: string; create: (apiKey: string) => ShippingProvider }> = {
  biteship: {
    env: 'BITESHIP_API_KEY',
    hint: 'Pakai sandbox key (biteship_test.*) dari dashboard Biteship.',
    create: (apiKey) => new BiteshipProvider({ apiKey }),
  },
  komerce: {
    env: 'RAJAONGKIR_API_KEY',
    hint: 'Pakai key dari dashboard rajaongkir.com (RajaOngkir by Komerce).',
    create: (apiKey) => new KomerceProvider({ apiKey }),
  },
  shipper: {
    env: 'SHIPPER_API_KEY',
    hint: 'Pakai key dari dashboard Shipper (opsional SHIPPER_BASE_URL untuk sandbox).',
    create: (apiKey) => new ShipperProvider({ apiKey, baseUrl: process.env.SHIPPER_BASE_URL }),
  },
}

const config = apiKeyConfig[providerName]
if (!config) {
  console.error(`PROVIDER tidak dikenal: "${providerName}" (pilih "biteship", "komerce", atau "shipper")`)
  process.exit(1)
}

const apiKey = process.env[config.env]
if (!apiKey) {
  console.error(`${config.env} belum diset. ${config.hint}`)
  process.exit(1)
}

const provider = config.create(apiKey)

console.log(`Pakai provider: ${providerName}`)

async function checkRates() {
  console.log('\n=== getRates ===')
  const rates = await provider.getRates({
    origin: { postalCode: '12440' },
    destination: { postalCode: '12240' },
    items: [{ weightGrams: 1000, value: 199000, lengthCm: 30, widthCm: 15, heightCm: 20, quantity: 1 }],
  })

  console.log(`Dapat ${rates.length} opsi rate:`)
  for (const r of rates.slice(0, 10)) {
    const durasi = r.estimatedDaysMin
      ? `${r.estimatedDaysMin}${r.estimatedDaysMax && r.estimatedDaysMax !== r.estimatedDaysMin ? `-${r.estimatedDaysMax}` : ''} hari`
      : '?'
    console.log(`  [${r.provider}] ${r.service} — Rp ${r.cost.toLocaleString('id-ID')} (${durasi})`)
  }
}

async function checkTracking(trackingId: string) {
  console.log('\n=== trackShipment ===')
  const courier = process.argv[3]
  const result = await provider.trackShipment(trackingId, courier ? { courier } : undefined)
  console.log(`Status: ${result.status}`)
  console.log(`Riwayat: ${result.statusHistory.length} entri`)
  for (const h of result.statusHistory.slice(-3)) {
    console.log(`  ${h.timestamp} — ${h.status}: ${h.description ?? ''}`)
  }
}

async function main() {
  try {
    await checkRates()
  } catch (err) {
    if (isShippingSDKError(err)) {
      console.error(`getRates gagal: [${err.code}] ${err.message} (retryable: ${err.retryable})`)
    } else {
      throw err
    }
  }

  const trackingId = process.argv[2]
  if (trackingId) {
    try {
      await checkTracking(trackingId)
    } catch (err) {
      if (isShippingSDKError(err)) {
        console.error(`trackShipment gagal: [${err.code}] ${err.message}`)
      } else {
        throw err
      }
    }
  } else {
    console.log(
      '\n(Skip tracking — kasih tracking ID sebagai argumen: bun run index.ts <trackingId> [courier] — courier wajib untuk komerce, misal jne)',
    )
  }
}

main()
