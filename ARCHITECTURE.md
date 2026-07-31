# ARCHITECTURE — ongkir-sdk

Referensi: `PRD.md`

---

## 1. Monorepo layout

```
ongkir-sdk/
├── packages/
│   ├── core/                    @ongkir-sdk/core
│   │   ├── src/
│   │   │   ├── types.ts         RateRequest, RateResult, TrackingResult, WebhookEvent
│   │   │   ├── contract.ts      interface ShippingProvider
│   │   │   ├── errors.ts        ShippingSDKError + error codes
│   │   │   ├── region/
│   │   │   │   ├── client.ts    HTTP client ke api-wilayah-indonesia
│   │   │   │   └── resolver.ts  resolve(nama/kode) → RegionRef
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── provider-biteship/       @ongkir-sdk/biteship
│   │   ├── src/
│   │   │   ├── adapter.ts       class BiteshipProvider implements ShippingProvider
│   │   │   ├── mapper.ts        normalisasi request/response Biteship ↔ tipe core
│   │   │   ├── errors.ts        map error code Biteship → ShippingSDKError
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── provider-komerce/        @ongkir-sdk/komerce
│   │   └── (struktur sama seperti biteship)
│   │
│   └── hono/                    @ongkir-sdk/hono
│       ├── src/
│       │   ├── middleware.ts    createShippingRoutes(provider) → Hono app
│       │   └── index.ts
│       └── package.json
│
├── examples/
│   ├── node-basic/
│   └── hono-api/
├── .changeset/
├── package.json                 workspace root
├── tsconfig.base.json
└── biome.json (atau eslint config)
```

Setiap package publish independen ke npm dengan nama scoped `@ongkir-sdk/*`.

## 2. Alur data & dependency arah

```
consumer app
   │
   ▼
@ongkir-sdk/biteship  ──┐
@ongkir-sdk/komerce   ──┼──► implements ──► @ongkir-sdk/core (contract, types, errors)
@ongkir-sdk/hono       ─┘         ▲
                                   │
                          @ongkir-sdk/core/region
                                   │
                                   ▼
                     api-wilayah-indonesia (HTTP, self-hosted)
```

- Provider package **bergantung ke core**, tidak sebaliknya. Core tidak pernah import dari provider package mana pun — ini yang menjaga adapter pattern tetap bersih.
- `@ongkir-sdk/hono` bergantung ke core saja (menerima instance `ShippingProvider` apa pun sebagai parameter), tidak hardcode ke provider tertentu.

## 3. Error handling

### 3.1 Normalisasi

Semua error dari provider (HTTP error, validation error, business error seperti "area tidak ditemukan") dipetakan ke satu tipe:

```ts
class ShippingSDKError extends Error {
  code: ShippingErrorCode        // enum stabil lintas provider
  provider: string                // 'biteship' | 'komerce'
  providerErrorCode?: string      // kode asli dari provider, buat debugging
  retryable: boolean
  cause?: unknown
}

type ShippingErrorCode =
  | 'INVALID_ORIGIN'
  | 'INVALID_DESTINATION'
  | 'RATE_NOT_AVAILABLE'
  | 'TRACKING_NOT_FOUND'
  | 'PROVIDER_AUTH_FAILED'
  | 'PROVIDER_RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'WEBHOOK_NOT_SUPPORTED'
  | 'CREATE_SHIPMENT_NOT_SUPPORTED'
  | 'CREATE_SHIPMENT_FAILED'
  | 'UNKNOWN'
```

### 3.2 Tanggung jawab per layer

- **Provider adapter** (`errors.ts` masing-masing): tahu bentuk error asli providernya, tugasnya cuma map ke `ShippingErrorCode` yang benar + isi `providerErrorCode` buat audit trail.
- **Core**: tidak pernah generate error provider-specific, hanya expose tipe dan util (`isRetryable(err)`, `isShippingSDKError(err)`).
- **Consumer**: selalu bisa `catch (err) { if (err instanceof ShippingSDKError) ... }` tanpa peduli provider mana yang dipakai.

### 3.3 Retry policy

- `retryable: true` untuk error kategori transient (`PROVIDER_RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, timeout jaringan).
- SDK **tidak** retry otomatis di v1 — hanya expose flag `retryable` supaya consumer app yang putuskan strategi retry (exponential backoff dsb). Auto-retry helper opsional bisa masuk v2 sebagai util terpisah, bukan default behavior.

## 4. Testing strategy

### 4.1 Level testing

| Level | Scope | Tool |
|---|---|---|
| Unit | Mapper/normalizer per provider (input mentah → tipe core) | Bun test / Vitest |
| Contract test | Semua provider adapter harus lulus test suite yang sama (`shared-contract-tests`) | Bun test |
| Integration (opsional, manual) | Panggil API asli pakai API key sandbox | Terpisah dari CI, dijalankan manual |

### 4.2 Contract test suite

Package `core` menyediakan `@ongkir-sdk/core/testing` yang expose test suite generik:

```ts
import { runProviderContractTests } from '@ongkir-sdk/core/testing'

runProviderContractTests(() => new BiteshipProvider({ apiKey: 'mock', httpClient: mockClient }))
```

Ini memastikan **semua provider** — sekarang dan yang ditambah nanti — konsisten memenuhi contract yang sama (misal: `getRates` dengan origin/destination invalid harus throw `ShippingSDKError` dengan code `INVALID_ORIGIN`, bukan raw error provider).

### 4.3 Mock provider HTTP

- Tiap provider adapter menerima `httpClient` sebagai dependency injection (bukan hardcode `fetch` langsung), supaya gampang di-mock di test.
- Fixture response asli (JSON) dari tiap provider disimpan di `__fixtures__/` per package — dipakai buat regression test kalau provider ubah response shape.

### 4.4 CI

- Setiap PR: lint, typecheck, unit test, contract test — semua tanpa perlu API key asli.
- Tidak ada integration test otomatis di CI (menghindari kebutuhan simpan secret provider di GitHub Actions untuk repo open source publik).

## 5. Webhook handling

```ts
parseWebhook(payload: unknown, headers: Headers): WebhookEvent
```

- Tiap provider adapter tanggung jawab verifikasi signature (kalau providernya sediakan) sebelum parse payload.
- Provider yang **tidak** menyediakan webhook di tier akun yang ditarget harus tetap mengimplementasikan `parseWebhook`, tapi melempar `ShippingSDKError` dengan code `WEBHOOK_NOT_SUPPORTED` dan mendokumentasikan keterbatasannya di README package. Contract test suite punya flag `supportsWebhooks` untuk skip test webhook pada provider seperti ini.
- Hasil dinormalisasi ke:

```ts
interface WebhookEvent {
  id: string        // provider's event id, atau `sdk:${sha256(provider+trackingId+status+timestamp)}` sebagai fallback deterministik
  provider: string
  type: string
  trackingId: string
  status: string
  normalizedStatus?: ShipmentStatus   // opsional, kalau payload bisa di-map ke status lintas provider
  timestamp: string
  rawPayload: unknown
}
```

  `ShipmentStatus` = `'confirmed' | 'pickup' | 'in_transit' | 'delivered' | 'cancelled' | 'unknown'` — status ternormalisasi untuk pemakaian transaksional (misal trigger update status di UI). Field `status` tetap menyimpan status mentah provider.

  Prioritas: pakai event ID asli dari provider kalau payload menyediakannya (paling reliable). Kalau tidak ada, generate hash deterministik dari field yang stabil — **bukan random UUID** — supaya retry webhook yang identik dari provider menghasilkan `id` yang sama, sehingga tetap idempotent saat dipakai sebagai unique key di sisi consumer.
- `@ongkir-sdk/hono` menyediakan helper route `POST /webhooks/:provider` yang otomatis pilih adapter yang sesuai dan panggil `parseWebhook`.
- **Idempotency bukan tanggung jawab SDK** — itu keputusan consumer app (misal pakai unique constraint `(provider, event_id)` di DB mereka, seperti pola yang sudah dipakai di proyek lain). SDK hanya menjamin `WebhookEvent.id` konsisten/stabil supaya bisa dipakai sebagai idempotency key.

## 6. Region resolver

```ts
interface RegionResolver {
  resolve(query: { province?: string; city?: string; district?: string; postalCode?: string }): Promise<RegionRef>
}

interface RegionRef {
  provinceCode: string
  cityCode: string
  districtCode: string
  postalCode?: string   // bisa null
  lat?: number
  lng?: number
}
```

- Default implementation: HTTP client ke instance `api-wilayah-indonesia`.
- Tiap provider adapter punya fungsi privat `toBiteshipAreaId(region: RegionRef)` / `toKomerceCode(region: RegionRef)` — mapping ini **bukan tanggung jawab core**. Catatan implementasi per provider:
  - Biteship: mapping statis area id masih stub; rate check berjalan via postal code langsung.
  - RajaOngkir (Komerce): tidak punya tabel ID statis yang bisa di-bundle, jadi `toKomerceCode` menjadi **lookup dinamis** ke endpoint pencarian destination (search by postal code), hasilnya di-cache in-memory per instance adapter. Konsekuensi: `getRates()` Komerce butuh `postalCode` di `RegionRef`.
- `trackShipment(trackingId, options?: TrackShipmentOptions)` — parameter opsional `options.courier` untuk provider yang API tracking-nya butuh kode kurir (RajaOngkir wajib, Biteship mengabaikan). Kalau wajib tapi tidak diberikan, adapter melempar `ShippingSDKError` dengan pesan jelas.
- Resolver bisa di-cache oleh consumer (in-memory Map sederhana) karena data wilayah jarang berubah — SDK menyediakan opsi `cache: Map | 'memory' | false` di config resolver, default in-memory dengan TTL panjang (misal 24 jam).

### 6.1 Struktur `RateRequest`

Dimensi paket dimodelkan **per-item**, bukan total box:

```ts
interface RateRequest {
  origin: RegionRef | { postalCode: string }
  destination: RegionRef | { postalCode: string }
  items: Array<{
    weightGrams: number          // wajib
    lengthCm?: number
    widthCm?: number
    heightCm?: number
    quantity?: number             // default 1
    value?: number                 // untuk asuransi, opsional
  }>
}
```

Alasan: lebih dekat ke bentuk cart ecommerce (banyak SKU beda berat/dimensi), dan provider (Biteship/Komerce) bisa hitung volumetric weight sendiri dari array item. Kalau provider tertentu butuh agregasi total box, itu tanggung jawab mapper di adapter masing-masing, bukan bocor ke public contract. Dimensi opsional karena banyak toko cuma tahu berat.

## 7. Build & release

- Build per package pakai `tsup` → output `dist/` dengan `.js` (ESM), `.cjs` (CJS), `.d.ts`.
- `package.json` tiap package: `"exports"` field dual ESM/CJS, `"sideEffects": false` buat tree-shaking.
- Versioning lewat Changesets (independen per package): `bunx changeset` saat PR berisi perubahan yang perlu rilis → `bunx changeset version` (bump versi + CHANGELOG) → commit ke `main`.
- Dep internal antar package memakai **range versi** (`"@ongkir-sdk/core": "^1.0.0"`), bukan `workspace:*`. Bun workspace tetap resolve ke package lokal selama versi cocok, dan manifest yang ter-publish valid untuk `npm install`.
- **Publish otomatis dari GitHub Actions** (`.github/workflows/release.yml`, trigger push ke `main`) memakai **Trusted Publishing (OIDC)** npm — tanpa token tersimpan. Prasyarat: npm CLI ≥11.5.1, runner GitHub-hosted, `id-token: write`, field `repository` di tiap `package.json`, dan konfigurasi trusted publisher per package di npmjs.com (workflow filename `release.yml`). Provenance attestation digenerate otomatis oleh npm.
- Workflow: lint → typecheck → test → build → `npm publish --provenance --access public` per package (urutan `core` → `biteship` → `komerce` → `hono`), melewati package yang versinya sudah ada di registry.
- Jangan publish langsung dari mesin lokal — publish hanya via CI agar identity & provenance konsisten.

## 8. Runtime compatibility

- Core dan provider package **tidak boleh** pakai API spesifik Node (`fs`, `crypto` Node-only) — pakai Web-standard API (`fetch`, `crypto.subtle`) supaya jalan di Cloudflare Workers/Deno/Bun/Node ≥18 tanpa polyfill.
- `@ongkir-sdk/hono` boleh assume runtime yang Hono dukung (semuanya di atas juga kompatibel).

## 9. Hono middleware (REST contract)

`@ongkir-sdk/hono` menyediakan `createShippingRoutes()` yang mengubah satu atau lebih `ShippingProvider` menjadi Hono sub-app:

```ts
createShippingRoutes({
  providers: Record<string, ShippingProvider>, // key = slug di URL, misal 'biteship' | 'komerce'
  defaultProvider?: string,                    // dipakai /rates & /track/:id; wajib kalau mount > 1
})
```

- `GET /rates` — query params `origin`, `destination` (postal code), `weight` (gram), dimensi/`quantity`/`value` opsional, divalidasi `zod`. Satu request = satu item. Response `RateResult[]`.
- `GET /track/:id` — query param opsional `courier` diteruskan ke `trackShipment(id, { courier })`.
- `POST /shipments` — body `CreateShipmentRequest` (zod-validated), dipanggilkan ke `createShipment()` dari `defaultProvider`. Response `ShipmentResult` dengan HTTP 201. Provider yang tidak mendukung create-order → `CREATE_SHIPMENT_NOT_SUPPORTED` (HTTP 501).
- `POST /webhooks/:provider` — memilih adapter dari map sesuai param URL, lalu `parseWebhook(payload, headers)`.
- `ShippingSDKError` → JSON `{ error: { code, message, provider, providerErrorCode, retryable } }` dengan status HTTP: 401 (auth/signature), 404 (tracking tidak ditemukan / provider tidak terdaftar), 422 (region invalid / rate tidak tersedia), 429 (rate limit), 501 (`WEBHOOK_NOT_SUPPORTED`/`CREATE_SHIPMENT_NOT_SUPPORTED`), 502 (provider unavailable / `CREATE_SHIPMENT_FAILED`), 500 (unknown). Error validasi → 400 `VALIDATION_ERROR`.
- `hono` & `zod` adalah peerDependencies (menghindari duplicate instance kalau consumer sudah punya hono).

## 10. createShipment (v2)

`createShipment(params: CreateShipmentRequest): Promise<ShipmentResult>` — membuat order pengiriman aktual ke provider (side-effect nyata: biaya transaksi, butuh saldo/balance di akun provider). **Bukan** operasi read-only seperti `getRates`/`trackShipment`.

```ts
interface CreateShipmentRequest {
  origin: ShipmentContact        // { name, phone, email?, address, postalCode? }
  destination: ShipmentContact   // { name, phone, email?, address, postalCode? }
  items: ShipmentItem[]          // { name, sku?, description?, value?, quantity?, weightGrams, lengthCm?, widthCm?, heightCm? }
  courier: string                // kode kurir, cocok dgn RateResult.provider
  service: string                // tipe layanan, cocok dgn RateResult.service
  referenceId?: string           // idempotency (Biteship reference_id / Shipper external_id)
  note?: string
  cashOnDelivery?: { amount: number }
}

interface ShipmentResult {
  provider: string
  orderId: string                // ID order di sistem provider
  awb?: string                   // nomor resi kurir (bisa belum ada saat baru dibuat)
  trackingId?: string
  service: string
  status: string                 // status mentah provider
  normalizedStatus?: ShipmentStatus
  cost: number
  currency: string
  estimatedDelivery?: string
}
```

Catatan per provider:

- **Biteship**: `POST /v1/orders`. Butuh saldo cukup; error `400020xx` di-map ke `CREATE_SHIPMENT_FAILED` (reference-id duplikat juga di sini, biar consumer bisa pakai `referenceId` sebagai idempotency key).
- **Komerce (RajaOngkir Shipping Cost tier)**: create-order **tidak tersedia** di tier ini — endpoint Store Order hanya ada di produk terpisah "API Shipping Delivery" (base URL `api.collaborator.komerce.id`, header `x-api-key`, akun/tier berbeda). `createShipment()` melempar `CREATE_SHIPMENT_NOT_SUPPORTED`, konsisten dengan perilaku `parseWebhook()` yang juga `WEBHOOK_NOT_SUPPORTED`.
- Error apa pun dari create-order dinormalisasi ke `ShippingSDKError` sebelum keluar dari adapter.

## 11. Status

Semua keputusan arsitektur di dokumen ini final untuk v1; section §10 adalah keputusan untuk v2 (Fase 4). Detail implementasi (edge case per provider) boleh muncul saat coding, tapi tidak mengubah contract publik tanpa update dokumen ini dulu.