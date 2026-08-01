# ongkir-sdk

> **Unofficial** multi-provider TypeScript SDK for shipping rate checking and tracking in Indonesia.
> Not affiliated with, endorsed by, or officially connected to Biteship, Komerce (RajaOngkir), or any courier service.

## Packages

| Package | Description | Status |
|---|---|---|
| `@ongkir-sdk/core` | Types, contract, errors, shared contract test suite | ✅ v1 |
| `@ongkir-sdk/biteship` | Biteship adapter (rates, tracking, webhook, shipment) | ✅ v1 |
| `@ongkir-sdk/komerce` | Komerce (RajaOngkir) adapter (rates, tracking) | ✅ v1 |
| `@ongkir-sdk/shipper` | Shipper adapter (rates, tracking, webhook, shipment) | ✅ v1 |
| `@ongkir-sdk/cache-memory` | In-memory cache wrapper around any provider (rates only) | ✅ v1 |
| `@ongkir-sdk/hono` | Hono middleware — expose providers as REST routes | ✅ v1 |

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
