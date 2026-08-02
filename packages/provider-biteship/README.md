# @ongkir-sdk/biteship

> Unofficial Biteship adapter for ongkir-sdk.
> Not affiliated with, endorsed by, or officially connected to Biteship.

Adapter TypeScript untuk cek ongkir (shipping rates), tracking resi, parser webhook, dan pembuatan order pengiriman via API Biteship. Dibangun di atas satu contract `ShippingProvider` dari `@ongkir-sdk/core`, jadi kamu bisa mengganti provider tanpa mengubah kode consumer.

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

## FAQ

**Apakah ini SDK resmi dari Biteship?**
Tidak. Ini adapter unofficial untuk SDK open source `ongkir-sdk`, tidak berafiliasi dengan Biteship.

**Butuh API key?**
Ya. Pakai key milikmu sendiri (bring-your-own-key), misal key sandbox `biteship_test.*` dari dashboard Testing Mode Biteship.

**Runtime apa yang didukung?**
Node ≥18, Bun, Deno, dan Cloudflare Workers — semua API memakai Web-standard (fetch, tanpa modul Node khusus).

**Aman untuk create shipment di production?**
`createShipment()` membuat order sungguhan yang menagih saldo akun Biteship. Selalu konfirmasi ke user dulu dan pakai `referenceId` untuk idempotency.

## Dokumentasi

Panduan lengkap dan API reference: [ongkir-sdk docs](https://cakfan.github.io/ongkir-sdk/api/biteship/) (halaman `@ongkir-sdk/biteship`).

## License

MIT
