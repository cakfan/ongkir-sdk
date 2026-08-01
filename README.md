# ongkir-sdk

> **Unofficial** multi-provider TypeScript SDK for shipping rate checking and tracking in Indonesia.
> Not affiliated with, endorsed by, or officially connected to Biteship, Komerce (RajaOngkir), or any courier service.

[![npm version](https://img.shields.io/npm/v/%40ongkir-sdk%2Fcore)](https://www.npmjs.com/package/@ongkir-sdk/core)
[![npm downloads](https://img.shields.io/npm/dm/%40ongkir-sdk%2Fcore)](https://www.npmjs.com/package/@ongkir-sdk/core)
[![license MIT](https://img.shields.io/npm/l/%40ongkir-sdk%2Fcore)](https://opensource.org/licenses/MIT)

## Features

- **Satu contract untuk semua provider** (`ShippingProvider`) — cek ongkir, tracking resi, parse webhook, dan buat shipment dengan API yang sama, apa pun provider di baliknya.
- **3 provider Indonesia siap pakai**: Biteship, Komerce (RajaOngkir), dan Shipper — ganti provider cukup ganti satu baris config.
- **Error ternormalisasi** (`ShippingSDKError`) — kode error konsisten lintas provider, plus flag `retryable` untuk keputusan retry.
- **Bring-your-own-key** — SDK murni client-side, tidak menyimpan atau mem-proxy API key kamu.
- **Runtime-agnostic** — Node ≥18, Bun, Deno, dan Cloudflare Workers (Web-standard API).
- **Opsional**: wrapper caching in-memory (`@ongkir-sdk/cache-memory`) dan REST middleware Hono (`@ongkir-sdk/hono`).

## Packages

| Package | Description | Version | Status |
|---|---|---|---|
| `@ongkir-sdk/core` | Types, contract, errors, shared contract test suite | [![npm](https://img.shields.io/npm/v/%40ongkir-sdk%2Fcore)](https://www.npmjs.com/package/@ongkir-sdk/core) | ✅ released |
| `@ongkir-sdk/biteship` | Biteship adapter (rates, tracking, webhook, shipment) | [![npm](https://img.shields.io/npm/v/%40ongkir-sdk%2Fbiteship)](https://www.npmjs.com/package/@ongkir-sdk/biteship) | ✅ released |
| `@ongkir-sdk/komerce` | Komerce (RajaOngkir) adapter (rates, tracking) | [![npm](https://img.shields.io/npm/v/%40ongkir-sdk%2Fkomerce)](https://www.npmjs.com/package/@ongkir-sdk/komerce) | ✅ released |
| `@ongkir-sdk/shipper` | Shipper adapter (rates, tracking, webhook, shipment) | [![npm](https://img.shields.io/npm/v/%40ongkir-sdk%2Fshipper)](https://www.npmjs.com/package/@ongkir-sdk/shipper) | ✅ released |
| `@ongkir-sdk/cache-memory` | In-memory cache wrapper around any provider (rates only) | [![npm](https://img.shields.io/npm/v/%40ongkir-sdk%2Fcache-memory)](https://www.npmjs.com/package/@ongkir-sdk/cache-memory) | ✅ released |
| `@ongkir-sdk/hono` | Hono middleware — expose providers as REST routes | [![npm](https://img.shields.io/npm/v/%40ongkir-sdk%2Fhono)](https://www.npmjs.com/package/@ongkir-sdk/hono) | ✅ released |

## Installation

Install core + adapter yang kamu pakai. Adapter otomatis ber-dependency ke `@ongkir-sdk/core`.

```bash
npm install @ongkir-sdk/core @ongkir-sdk/biteship
# atau: npm install @ongkir-sdk/core @ongkir-sdk/komerce
# atau: npm install @ongkir-sdk/core @ongkir-sdk/shipper
```

Paket opsional:

```bash
npm install @ongkir-sdk/hono          # REST middleware (butuh hono + zod)
npm install @ongkir-sdk/cache-memory  # wrapper caching hasil getRates
```

## Quick start

```ts
import { BiteshipProvider } from '@ongkir-sdk/biteship'
import { KomerceProvider } from '@ongkir-sdk/komerce'
import { ShipperProvider } from '@ongkir-sdk/shipper'

const provider = new KomerceProvider({ apiKey: process.env.RAJAONGKIR_API_KEY! })

const rates = await provider.getRates({
  origin: { postalCode: '12440' },
  destination: { postalCode: '12240' },
  items: [{ weightGrams: 1000, value: 199000, quantity: 1 }],
})

const tracking = await provider.trackShipment('AWB001', { courier: 'jne' })
```

Provider Shipper memakai flow yang sama, tapi wajib `postalCode` di `origin`/`destination` (`area_id` di-resolve otomatis oleh adapter):

```ts
const shipper = new ShipperProvider({ apiKey: process.env.SHIPPER_API_KEY! })

const shipperRates = await shipper.getRates({
  origin: { postalCode: '10110' },
  destination: { postalCode: '40111' },
  items: [{ weightGrams: 1000, value: 50000, quantity: 1 }],
})
```

Tiga provider lulus contract test suite yang sama (`runProviderContractTests()` dari `@ongkir-sdk/core/testing`) — ganti provider tanpa ubah kode consumer.

### REST (Hono)

```ts
import { createShippingRoutes } from '@ongkir-sdk/hono'
import { BiteshipProvider } from '@ongkir-sdk/biteship'

const app = new Hono()
app.route('/', createShippingRoutes({
  providers: { biteship: new BiteshipProvider({ apiKey }) },
}))
// GET /rates?origin=12440&destination=12240&weight=1000
// GET /track/:id?courier=jne
// POST /shipments   (CreateShipmentRequest — side-effect nyata, berpotensi menagih saldo)
// POST /webhooks/:provider
```

## Dokumen

- [PRD.md](./PRD.md) — produk & scope
- [ARCHITECTURE.md](./ARCHITECTURE.md) — keputusan arsitektur (final untuk v1)
- [ROADMAP.md](./ROADMAP.md) — progress fase
- [docs/deployment.md](./docs/deployment.md) — deploy instance `api-wilayah-indonesia`
- [`examples/node-basic`](./examples/node-basic) — contoh SDK langsung
- [`examples/hono-api`](./examples/hono-api) — contoh REST API

## Status

v1 (Fase 0–3) selesai: core + 3 provider + Hono middleware, read-only. Fase 4 (v2) selesai: `createShipment` aktif — Biteship membuat order sungguhan (`POST /v1/orders`), Shipper membuat order sungguhan (`POST /v3/order`, `rate_id` di-resolve ulang dari pricing), Komerce melempar `CREATE_SHIPMENT_NOT_SUPPORTED` (batasan tier Shipping Cost), Hono punya route `POST /shipments`. Fase 5 selesai: paket `@ongkir-sdk/cache-memory` tersedia sebagai wrapper caching opsional. Lihat [ROADMAP.md](./ROADMAP.md).

## License

MIT
