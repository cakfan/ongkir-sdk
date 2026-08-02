# @ongkir-sdk/core

Tipe, kontrak, error, dan utilitas testing untuk `ongkir-sdk` — fondasi yang dipakai semua provider adapter untuk cek ongkir (shipping rates) & tracking pengiriman di Indonesia.

## Install

```bash
bun add @ongkir-sdk/core
```

## Isi package

- **Contract** — interface `ShippingProvider` yang wajib dipenuhi setiap adapter.
- **Types** — `RateRequest`, `RateResult`, `TrackingResult`, `WebhookEvent`, dll.
- **Error** — `ShippingSDKError` ternormalisasi + kode error standar.
- **Region resolver** — lookup region Indonesia (provinsi/kota/kecamatan/kodepos).
- **Testing** — contract test suite bersama lewat `@ongkir-sdk/core/testing`.

## Error handling

Semua provider melempar `ShippingSDKError` — jangan pernah membiarkan error/response mentah provider bocor ke consumer.

```ts
import { ShippingSDKError, isRetryable, isShippingSDKError } from '@ongkir-sdk/core'

try {
  const rates = await provider.getRates({ origin, destination, items })
} catch (err) {
  if (isShippingSDKError(err)) {
    // err.code, err.message, err.provider, err.retryable, err.providerErrorCode
    if (err.retryable) return retry(provider)
  }
}
```

| `ShippingErrorCode` | Arti |
|---|---|
| `INVALID_ORIGIN` | Origin tidak valid / tidak bisa di-resolve |
| `INVALID_DESTINATION` | Destination tidak valid / tidak bisa di-resolve |
| `RATE_NOT_AVAILABLE` | Tidak ada tarif untuk kombinasi yang diminta |
| `TRACKING_NOT_FOUND` | Nomor resi tidak ditemukan |
| `PROVIDER_AUTH_FAILED` | API key ditolak provider |
| `PROVIDER_RATE_LIMITED` | Kuota/rate limit provider habis |
| `PROVIDER_UNAVAILABLE` | Provider down atau error internal |
| `WEBHOOK_SIGNATURE_INVALID` | Signature webhook tidak cocok |
| `WEBHOOK_NOT_SUPPORTED` | Provider/tier tidak menyediakan webhook |
| `CREATE_SHIPMENT_NOT_SUPPORTED` | Provider/tier tidak mendukung pembuatan order |
| `CREATE_SHIPMENT_FAILED` | Provider menolak order pengiriman |
| `UNKNOWN` | Error lain yang belum terklasifikasi |

Helper: `isShippingSDKError(err)` untuk guard type, `isRetryable(err)` untuk keputusan retry, dan `SHIPPING_ERROR_CODES` untuk daftar lengkap kode.

## Contract `ShippingProvider`

```ts
import type { ShippingProvider } from '@ongkir-sdk/core'

const provider: ShippingProvider = {
  async getRates(params) { /* ... */ },
  async trackShipment(trackingId, options) { /* ... */ },
  parseWebhook(payload, headers) { /* ... */ },
  async createShipment(params) { /* ... */ },
}
```

Interface lengkap:

```ts
export interface ShippingProvider {
  getRates(params: RateRequest): Promise<RateResult[]>
  trackShipment(trackingId: string, options?: TrackShipmentOptions): Promise<TrackingResult>
  parseWebhook(payload: unknown, headers: Headers): WebhookEvent
  createShipment(params: CreateShipmentRequest): Promise<ShipmentResult>
}
```

Tipe hasil selalu ternormalisasi — `RateResult.provider` memakai nama SDK (bukan nama endpoint provider), `cost` selalu angka, `currency` selalu diisi.

> **Warning:** `createShipment()` adalah aksi nyata — membuat order pengiriman ke provider dan berpotensi menagih saldo. Provider yang tidak mendukungnya melempar `CREATE_SHIPMENT_NOT_SUPPORTED`; provider yang menolak order melempar `CREATE_SHIPMENT_FAILED`. Jangan panggil sebelum user mengonfirmasi, dan pakai `referenceId` untuk idempotency kalau provider mendukung.

## Tipe utama

- `RateRequest` / `RateResult` — permintaan dan hasil cek tarif. Origin/destination menerima `{ postalCode }` atau `RegionRef` lengkap.
- `TrackingResult` — riwayat status pengiriman (`statusHistory`) + estimasi dan metadata.
- `WebhookEvent` — hasil parse webhook: `id`, `provider`, `type`, `trackingId`, `status`, `normalizedStatus?`, `timestamp`, `rawPayload`.
- `CreateShipmentRequest` / `ShipmentResult` — input dan hasil pembuatan order. `CreateShipmentRequest` berisi `origin`/`destination` (`ShipmentContact`), `items` (`ShipmentItem[]`), `courier`, `service`, plus opsional `referenceId`, `note`, `cashOnDelivery`. `ShipmentResult` selalu berisi `orderId`, plus `awb?`, `trackingId?`, `status`, `normalizedStatus?`, `cost`, `currency`.
- `ShipmentStatus` — status ternormalisasi lintas provider: `confirmed` | `pickup` | `in_transit` | `delivered` | `cancelled` | `unknown`.
- `RegionRef` — provinsi/kota/kecamatan/kodepos (+ `lat`/`lng` opsional).

## Region resolver

Mencari `RegionRef` dari query provinsi/kota/kecamatan/kodepos. Default memakai endpoint `https://wilayah.id/api` (instans `api-wilayah-indonesia`).

```ts
import { RegionResolver } from '@ongkir-sdk/core'

const resolver = new RegionResolver() // cache in-memory default, TTL 24 jam
const ref = await resolver.resolve({ postalCode: '12440' })
// { provinceCode: '31', cityCode: '3175', districtCode: '317502', postalCode: '12440' }
```

Konfigurasi: `baseUrl` (endpoint lain), `cache` (`false` untuk matikan, atau objek `Map` custom), `ttlMs` (masa cache). Query yang tidak ditemukan melempar `RegionNotFoundError`.

## Testing

`runProviderContractTests()` menjalankan suite kontrak yang sama untuk semua adapter — jadi kalau adapter lulus, consumer yakin bisa ganti provider tanpa ubah kode. Membutuhkan runner `bun test` dan provider yang di-mock tanpa API key asli.

```ts
import { describe } from 'bun:test'
import { runProviderContractTests } from '@ongkir-sdk/core/testing'
import { MyProvider } from './provider'

describe('MyProvider', () => {
  runProviderContractTests({
    createProvider: () => new MyProvider({ apiKey: 'YOUR_API_KEY' }),
    validTrackingId: 'JNE001234567890',
    supportsSignatureVerification: false,
    supportsWebhooks: false,
    // true → suite juga mengetes createShipment (success + invalid request)
    supportsCreateShipment: true,
  })
})
```

## FAQ

**Apakah `@ongkir-sdk/core` sudah cukup untuk cek ongkir?**
Belum — core hanya mendefinisikan contract, tipe, dan utilitas. Untuk memanggil API cek ongkir, pasang adapter provider seperti `@ongkir-sdk/biteship`, `@ongkir-sdk/komerce`, atau `@ongkir-sdk/shipper`.

**Butuh API key?**
Ya. Tiap provider memakai API key milikmu sendiri (bring-your-own-key). SDK tidak menyimpan atau mem-proxy key ke server mana pun.

**Runtime apa yang didukung?**
Node ≥18, Bun, Deno, dan Cloudflare Workers. Semua kode memakai Web-standard API (`fetch`, `crypto.subtle`) tanpa dependensi khusus Node.

## Dokumentasi

Panduan lengkap dan API reference: [ongkir-sdk docs](https://cakfan.github.io/ongkir-sdk/api/core/) (halaman `@ongkir-sdk/core`).

## License

MIT
