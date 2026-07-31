# @ongkir-sdk/hono

Hono middleware untuk `ongkir-sdk` — expose satu atau lebih `ShippingProvider` sebagai REST endpoint siap pakai.

> Unofficial SDK. Not affiliated with, endorsed by, or officially connected to Biteship, Komerce, or any courier service.

## Install

```bash
bun add @ongkir-sdk/hono @ongkir-sdk/core hono zod
```

`hono` dan `zod` adalah peer dependencies — versi yang dipakai app Anda yang menentukan.

## Pemakaian

```ts
import { Hono } from 'hono'
import { createShippingRoutes } from '@ongkir-sdk/hono'
import { BiteshipProvider } from '@ongkir-sdk/biteship'
import { KomerceProvider } from '@ongkir-sdk/komerce'

const app = new Hono()

app.route(
  '/',
  createShippingRoutes({
    providers: {
      biteship: new BiteshipProvider({ apiKey: process.env.BITESHIP_API_KEY! }),
      komerce: new KomerceProvider({ apiKey: process.env.RAJAONGKIR_API_KEY! }),
    },
    // Provider untuk /rates, /track/:id & /shipments. Wajib kalau mount > 1 provider.
    defaultProvider: process.env.DEFAULT_PROVIDER ?? 'biteship',
  }),
)

export default app
```

## Routes

### `GET /rates`

Query params (zod-validated):

| Param | Tipe | Keterangan |
|---|---|---|
| `origin` | string | Postal code asal |
| `destination` | string | Postal code tujuan |
| `weight` | number | Berat dalam gram (wajib > 0) |
| `length`/`width`/`height` | number? | Dimensi cm |
| `quantity` | number? | Default 1 |
| `value` | number? | Nilai barang (untuk asuransi) |

Response: `RateResult[]` ternormalisasi. Satu request = satu item.

### `GET /track/:id`

Query params: `courier` (opsional, wajib untuk provider yang API tracking-nya butuh kode kurir seperti RajaOngkir).

Response: `TrackingResult` ternormalisasi.

### `POST /webhooks/:provider`

`/webhooks/:provider` memilih adapter dari map `providers` sesuai nama di URL, lalu memanggil `parseWebhook(payload, headers)`. Body wajib JSON valid. Provider yang tidak support webhook (misal Komerce tier Shipping Cost) melempar `WEBHOOK_NOT_SUPPORTED` → HTTP 501.

Response: `{ ok: true, event: WebhookEvent }`.

### `POST /shipments`

Body wajib JSON valid dan sesuai `CreateShipmentRequest` (origin/destination berisi `name`, `phone`, `address`, `postalCode?`; `items` min 1 dengan `name` + `weightGrams`; `courier`; `service`; plus opsional `referenceId`, `note`, `cashOnDelivery`).

Response: HTTP 201 `ShipmentResult` ternormalisasi (`orderId`, `awb?`, `trackingId?`, `status`, `normalizedStatus?`, `cost`, `currency`).

> **Warning:** route ini memicu aksi nyata di provider (membuat order dan berpotensi menagih saldo). Pastikan dipanggil hanya setelah user mengonfirmasi, dan manfaatkan `referenceId` untuk idempotency kalau provider mendukung.

## Error shape

Semua `ShippingSDKError` dari provider dinormalisasi ke JSON dengan HTTP status sesuai kode:

```json
{
  "error": {
    "code": "TRACKING_NOT_FOUND",
    "message": "Invalid Awb",
    "provider": "komerce",
    "providerErrorCode": "404",
    "retryable": false
  }
}
```

| ShippingErrorCode | HTTP |
|---|---|
| `INVALID_ORIGIN`, `INVALID_DESTINATION`, `RATE_NOT_AVAILABLE` | 422 |
| `TRACKING_NOT_FOUND` | 404 |
| `PROVIDER_AUTH_FAILED` | 401 |
| `PROVIDER_RATE_LIMITED` | 429 |
| `PROVIDER_UNAVAILABLE` | 502 |
| `WEBHOOK_SIGNATURE_INVALID` | 401 |
| `WEBHOOK_NOT_SUPPORTED` | 501 |
| `CREATE_SHIPMENT_NOT_SUPPORTED` | 501 |
| `CREATE_SHIPMENT_FAILED` | 502 |
| `UNKNOWN` | 500 |

Error validasi query/body → 400 `VALIDATION_ERROR`. Provider tidak terdaftar di map → 404 `PROVIDER_NOT_FOUND`. Error non-SDK tidak dibocorkan ke response (hanya di-`console.error`, response 500 generic).

## Contoh

Lihat `examples/hono-api` — server minimal yang mount Biteship dan Komerce sekaligus, ganti provider tinggal ubah `DEFAULT_PROVIDER`.
