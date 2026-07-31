# @ongkir-sdk/biteship

> Unofficial Biteship adapter for ongkir-sdk.
> Not affiliated with, endorsed by, or officially connected to Biteship.

## Installation

```bash
bun add @ongkir-sdk/biteship
```

## Usage

```ts
import { BiteshipProvider } from '@ongkir-sdk/biteship'

const provider = new BiteshipProvider({
  apiKey: process.env.BITESHIP_API_KEY!,
})

// Get shipping rates
const rates = await provider.getRates({
  origin: { postalCode: '12440' },
  destination: { postalCode: '12240' },
  items: [{ weightGrams: 1000, value: 50000 }],
})

// Track shipment
const tracking = await provider.trackShipment('TRACKING_ID')

// Create shipment
const shipment = await provider.createShipment({
  origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '12440' },
  destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
  items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
  courier: 'jne',
  service: 'reg',
})

// Parse webhook
const event = provider.parseWebhook(payload, headers)
```

> **Warning:** `createShipment()` is a live action that creates a real order and will be charged by Biteship. It is idempotent when you pass the same `referenceId` — the provider rejects duplicate `referenceId` values. Only call it when the user explicitly confirms the order.

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | Biteship API key (required) |
| `baseUrl` | `string` | `https://api.biteship.com` | API base URL |
| `httpClient` | `function` | `fetch` | Custom HTTP client for testing |

## Supported features

- `getRates()` — via postal code
- `trackShipment()` — via Biteship tracking ID
- `createShipment()` — via the orders API (live action, may incur charges)
- `parseWebhook()` — `order.status`, `order.price`, `order.waybill_id` events

## License

MIT
