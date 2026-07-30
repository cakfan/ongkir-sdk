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

// Parse webhook
const event = provider.parseWebhook(payload, headers)
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | Biteship API key (required) |
| `baseUrl` | `string` | `https://api.biteship.com` | API base URL |
| `httpClient` | `function` | `fetch` | Custom HTTP client for testing |

## Supported features

- `getRates()` — via postal code
- `trackShipment()` — via Biteship tracking ID
- `parseWebhook()` — `order.status`, `order.price`, `order.waybill_id` events

## License

MIT
