import { BiteshipProvider } from '@ongkir-sdk/biteship'
import { ShippingSDKError } from '@ongkir-sdk/core'

const apiKey = process.env.BITSHIP_KEY
if (!apiKey) {
  console.error('Missing BITSHIP_KEY in .env')
  process.exit(1)
}

const rateRequest = {
  origin: { postalCode: '12440' },
  destination: { postalCode: '40111' },
  items: [{ weightGrams: 1000, quantity: 1, value: 150000 }],
}

function summarizeRates(
  rates: { provider: string; service: string; cost: number; estimatedDaysMin?: number; estimatedDaysMax?: number }[],
): string[] {
  return rates.slice(0, 10).map((r) => {
    const days =
      r.estimatedDaysMin == null
        ? ''
        : ` (${r.estimatedDaysMin}${r.estimatedDaysMax != null && r.estimatedDaysMax !== r.estimatedDaysMin ? `-${r.estimatedDaysMax}` : ''} hari)`
    return `${r.provider} ${r.service} = Rp${r.cost}${days}`
  })
}

async function run(label: string, fn: () => Promise<unknown>): Promise<unknown> {
  const startedAt = Date.now()
  try {
    const result = await fn()
    console.log(`\n=== ${label} — OK (${Date.now() - startedAt} ms) ===`)
    return result
  } catch (error) {
    console.log(`\n=== ${label} — ERROR (${Date.now() - startedAt} ms) ===`)
    if (error instanceof ShippingSDKError) {
      console.log(`code=${error.code} retryable=${error.retryable}`)
      console.log(`message=${error.message}`)
      if (error.providerErrorCode) console.log(`providerErrorCode=${error.providerErrorCode}`)
    } else {
      console.log(error)
    }
  }
}

const provider = new BiteshipProvider({ apiKey })

const rates = await run('Biteship getRates', () => provider.getRates(rateRequest))
if (Array.isArray(rates)) {
  console.log(`total rates: ${rates.length}`)
  console.log(summarizeRates(rates).join('\n'))
}

await run('Biteship trackShipment (fake AWB, expect error)', () => provider.trackShipment('LIVE-TEST-INVALID-0001'))

console.log('\nDone.')
