# @ongkir-sdk/shipper

> Unofficial Shipper adapter for ongkir-sdk.
> Not affiliated with, endorsed by, or officially connected to Shipper.

Adapter TypeScript untuk cek ongkir (shipping rates), tracking, parser webhook, dan pembuatan order pengiriman via API Shipper (logistics v3). Dibangun di atas contract `ShippingProvider` dari `@ongkir-sdk/core` — ganti provider tanpa mengubah kode consumer.

## Installation

```bash
bun add @ongkir-sdk/shipper
```

## Usage

```ts
import { ShipperProvider } from '@ongkir-sdk/shipper'

const provider = new ShipperProvider({
  apiKey: process.env.SHIPPER_API_KEY!,
})

// Get shipping rates
const rates = await provider.getRates({
  origin: { postalCode: '10110' },
  destination: { postalCode: '40111' },
  items: [{ weightGrams: 1000, lengthCm: 10, widthCm: 10, heightCm: 10, value: 50000 }],
})

// Track shipment (Shipper order ID)
const tracking = await provider.trackShipment('ORDER_ID')

// Create shipment
const shipment = await provider.createShipment({
  origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '10110' },
  destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
  items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
  courier: 'JNE',
  service: 'REG',
})

// Parse webhook
const event = provider.parseWebhook(payload, headers)
```

> **Warning:** `createShipment()` is a live action that creates a real order and will be charged by Shipper. It is idempotent when you pass the same `referenceId` — the provider maps it to `external_id`. Only call it when the user explicitly confirms the order.

> **Note:** Shipper's pricing API requires an `area_id` (kelurahan level). The adapter resolves it automatically from the postal code via the Location API and caches it in-memory, so a postal code is **required** in `origin`/`destination`. `trackShipment()` takes a Shipper order ID, not an AWB number.

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | — | Shipper API key (`X-API-Key` header) |
| `baseUrl` | `string` | `https://merchant-api.shipper.id` | API base URL (sandbox: `https://merchant-api-sandbox.shipper.id`) |
| `httpClient` | `function` | `fetch` | Custom HTTP client for testing |

## Supported features

- `getRates()` — via postal code → area_id lookup + domestic pricing
- `trackShipment()` — via Shipper order ID (`GET /v3/order/{id}`)
- `createShipment()` — re-queries pricing to resolve `rate_id` matching `courier` + `service`, then `POST /v3/order`
- `parseWebhook()` — status events from `external_status`; Shipper does not provide webhook signature verification

## How `createShipment` resolves `rate_id`

Shipper's create-order API requires a `rate_id` from the pricing response, but the ongkir-sdk contract only carries `courier` + `service`. The adapter calls `POST /v3/pricing/domestic` internally, finds the rate whose logistic code matches `courier` and rate name matches `service`, then passes its `rate.id` to `POST /v3/order`. No contract changes were needed.

### COD

When `cashOnDelivery` is provided, the pricing re-query runs with `cod: true` and the order body carries `courier.cod: true` plus `courier.cod_amount` (required by Shipper for the order to be treated as COD).

### Insurance

Shipper requires `use_insurance: true` when a rate's `must_use_insurance` is set (high-value items over the courier's threshold). The adapter reads that flag from the re-queried pricing response and sets `courier.use_insurance` accordingly — otherwise Shipper rejects the order.

## FAQ

**Apakah ini SDK resmi dari Shipper?**
Tidak. Ini adapter unofficial untuk SDK open source `ongkir-sdk`, tidak berafiliasi dengan Shipper.

**Butuh API key?**
Ya. Pakai API key milikmu sendiri (header `X-API-Key`). Sandbox: `https://merchant-api-sandbox.shipper.id`, production: `https://merchant-api.shipper.id`.

**Kenapa `getRates()`/`createShipment()` wajib `postalCode`?**
API pricing Shipper butuh `area_id` level kelurahan yang di-resolve adapter dari postal code secara otomatis (dan di-cache per instance). Tanpa postal code, origin/destination tidak bisa di-resolve.

**`trackShipment()` pakai nomor resi atau order ID?**
Order ID Shipper. Adapter memanggil `GET /v3/order/{id}` untuk detail + AWB + status.

## License

MIT
