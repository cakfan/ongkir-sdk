import { BiteshipProvider } from '@ongkir-sdk/biteship'
import { isShippingSDKError } from '@ongkir-sdk/core'

const apiKey = process.env.BITESHIP_API_KEY
if (!apiKey) {
  console.error('BITESHIP_API_KEY belum diset. Pakai sandbox key (biteship_test.*) dari dashboard Biteship.')
  process.exit(1)
}

const provider = new BiteshipProvider({ apiKey })

async function checkRates() {
  console.log('\n=== getRates ===')
  const rates = await provider.getRates({
    origin: { postalCode: '12440' },
    destination: { postalCode: '12240' },
    items: [{ weightGrams: 1000, value: 199000, lengthCm: 30, widthCm: 15, heightCm: 20, quantity: 1 }],
  })

  console.log(`Dapat ${rates.length} opsi rate:`)
  for (const r of rates.slice(0, 5)) {
    const durasi = r.estimatedDaysMin
      ? `${r.estimatedDaysMin}${r.estimatedDaysMax && r.estimatedDaysMax !== r.estimatedDaysMin ? `-${r.estimatedDaysMax}` : ''} hari`
      : '?'
    console.log(`  [${r.provider}] ${r.service} — Rp ${r.cost.toLocaleString('id-ID')} (${durasi})`)
  }
}

async function checkTracking(trackingId: string) {
  console.log('\n=== trackShipment ===')
  const result = await provider.trackShipment(trackingId)
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
    console.log('\n(Skip tracking — kasih tracking ID sebagai argumen: bun run index.ts <trackingId>)')
  }
}

main()
