# PRD — ongkir-sdk

**Status:** Draft
**Owner:** Jabir
**Tipe proyek:** Open source library (npm package)

---

## 1. Ringkasan

`ongkir-sdk` adalah TypeScript SDK **unofficial, multi-provider** untuk cek ongkir dan tracking pengiriman di Indonesia. SDK ini membungkus API dari agregator logistik (Biteship, Komerce/RajaOngkir, dll) di balik satu interface yang konsisten, sehingga developer tidak perlu belajar bentuk response tiap provider satu-satu.

**Bukan** API server hosted, bukan reseller kredensial. User SDK memakai API key milik mereka sendiri (*bring-your-own-key*).

## 2. Latar belakang & masalah

- Tiap provider ongkir (Biteship, Komerce, dst) punya bentuk request/response, penamaan status, dan konvensi error yang berbeda.
- Developer Indonesia yang mau ganti provider (misal dari Komerce ke Biteship) harus menulis ulang integrasi dari nol.
- Belum ada SDK open source yang netral, tidak terikat satu provider, dan idiomatic untuk ekosistem TypeScript/Bun/Hono.

## 3. Tujuan (Goals)

1. Satu interface (`ShippingProvider`) yang sama untuk cek ongkir, buat pesanan pengiriman, dan tracking — apa pun provider di baliknya.
2. Mudah ganti/tambah provider tanpa mengubah kode konsumen (adapter pattern).
3. Tersedia optional adapter untuk framework populer (Hono middleware) sebagai package terpisah.
4. Dokumentasi jelas menyatakan status "unofficial, not affiliated" untuk tiap provider.

## 4. Non-goals

- Tidak menyimpan/mem-proxy API key milik user ke server manapun (no backend, pure client library di tahap awal).
- Tidak menyediakan dashboard, billing, atau UI.
- Tidak scraping endpoint yang tidak didokumentasikan publik oleh provider.
- Tidak menjadi reseller/agregator komersial atas nama sendiri (lihat diskusi legal — beda track dari ide awal "API RajaOngkir sendiri").

## 5. Target pengguna

- Developer/tim engineering yang membangun ecommerce/marketplace di Indonesia (termasuk use case internal: Ichimart, ecommerce boilerplate).
- Tidak terbatas pada stack tertentu — SDK inti tanpa dependency framework, adapter Hono opsional.

## 6. Arsitektur

### 6.1 Prinsip
- **Adapter pattern**, konsisten dengan pola yang sudah dipakai di proyek lain (payment, notification, storage).
- Core package tidak tahu apa-apa soal provider spesifik — hanya mendefinisikan contract.

### 6.2 Struktur package (monorepo, opsional pakai Bun workspaces)

```
packages/
  core/                 → @ongkir-sdk/core (types, contract, error normalization)
  provider-biteship/    → @ongkir-sdk/biteship
  provider-komerce/     → @ongkir-sdk/komerce
  provider-shipper/     → @ongkir-sdk/shipper
  cache-memory/         → @ongkir-sdk/cache-memory (wrapper caching opsional)
  hono/                 → @ongkir-sdk/hono (optional middleware)
```

### 6.3 Contract inti

```ts
interface ShippingProvider {
  getRates(params: RateRequest): Promise<RateResult[]>
  trackShipment(trackingId: string, options?: TrackShipmentOptions): Promise<TrackingResult> // options.courier untuk provider yang butuh kode kurir (RajaOngkir)
  parseWebhook(payload: unknown, headers: Headers): WebhookEvent
  createShipment(params: CreateShipmentRequest): Promise<ShipmentResult> // v2 (Fase 4)
}
```

- `RateRequest`: origin, destination (pakai kode wilayah standar internal), berat, dimensi opsional.
- Semua response provider dinormalisasi ke tipe hasil yang sama (`RateResult`, `TrackingResult`, dll) — konsumen tidak perlu tahu bentuk asli response Biteship vs Komerce.
- Error dinormalisasi ke `ShippingSDKError` dengan `code` yang konsisten lintas provider.

### 6.4 Resolusi wilayah

Provider berbeda punya sistem ID wilayah berbeda (Biteship pakai area_id sendiri, Komerce pakai kode wilayah RajaOngkir). Core package menyediakan util resolusi dari nama/kode wilayah standar → ID masing-masing provider.

**Sumber data:** [`api-wilayah-indonesia`](https://github.com/cakfan/api-wilayah-indonesia) (Hono + Bun + SQLite, MIT license) — self-hosted, bukan dependency bundled. `ongkir-sdk` core hanya perlu HTTP client tipis ke instance ini (base URL configurable), sehingga user bisa ganti sumber data wilayah lain kalau perlu.

Catatan implementasi:
- Field `postal_code`/`latitude`/`longitude` bisa `null` untuk ~14.5% desa (terutama Papua) — resolver harus fallback graceful, bukan throw.
- Data lat/lng dari OpenStreetMap (ODbL) — atribusi ke OSM contributors wajib dicantumkan di dokumentasi kalau data ini di-redistribute lebih lanjut.
- Instance `api-wilayah-indonesia` perlu di-deploy terpisah (bukan bagian rilis npm `ongkir-sdk`) — masuk task infra di Fase 0.

## 7. Provider di scope v1

| Provider | Rate check | Tracking | Webhook | Create shipment |
|---|---|---|---|---|
| Biteship | ✅ (v1) | ✅ (v1) | ✅ (v1) | ✅ (v2) |
| Komerce (RajaOngkir) | ✅ (v1) | ✅ (v1) | Tergantung tier | ❌ (tier Shipping Cost) |
| Shipper | ✅ (v3) | ✅ (v3) | ✅ (v3) | ✅ (v3) |

**v1 scope: read-only** — `getRates` + `trackShipment` + webhook parser. `createShipment` (buat pesanan/AWB aktual ke provider) digeser ke v2 supaya v1 bisa rilis lebih cepat dan teruji dulu di jalur yang lebih sederhana (tidak ada side-effect transaksional ke provider).

Provider lain (KiriminAja) masuk roadmap v3 opsional; Shipper sudah selesai di Fase 5.

## 8. Tech stack

- TypeScript, target ESM + CJS dual build.
- Runtime-agnostic (jalan di Node, Bun, Cloudflare Workers, Deno).
- Validasi payload: `zod`.
- Testing: Bun test runner / Vitest, dengan mock provider untuk unit test tanpa API key asli.
- Build: `tsup`.
- Package manager: Bun.

## 9. Legal & branding

- Nama dan dokumentasi wajib mencantumkan disclaimer: *"Unofficial SDK. Not affiliated with, endorsed by, or officially connected to Biteship, Komerce, or any courier service."*
- Tidak menggunakan logo/trademark provider di README atau package metadata.
- Tidak menyalin dokumentasi API provider secara verbatim — semua deskripsi ditulis ulang.
- Lisensi: MIT (default open source, memudahkan adopsi).

## 10. Metrik keberhasilan (opsional, kalau mau ditrack)

- npm weekly downloads.
- Jumlah provider adapter yang tersedia.
- Adopsi internal: dipakai sebagai shipping adapter di Ichimart / ecommerce boilerplate.

## 11. Versioning strategy

**Independent versioning per package**, dikelola pakai [Changesets](https://github.com/changesets/changesets):
- `@ongkir-sdk/core`, `@ongkir-sdk/biteship`, `@ongkir-sdk/komerce`, `@ongkir-sdk/shipper`, `@ongkir-sdk/cache-memory`, `@ongkir-sdk/hono` masing-masing punya nomor versi sendiri.
- Perubahan di satu adapter (misal Komerce ubah response format) tidak memaksa bump versi package lain.
- Trade-off: butuh disiplin changelog per package, tapi lebih ramah untuk consumer yang cuma pakai sebagian provider.

## 12. Roadmap fase tinggi

1. **Fase 0 — Fondasi**: core contract (read-only: `getRates`, `trackShipment`, `parseWebhook`), types, error normalization. Deploy instance `api-wilayah-indonesia` + HTTP client resolver di core.
2. **Fase 1 — Provider Biteship**: rate check, tracking, webhook parser.
3. **Fase 2 — Provider Komerce**: rate check, tracking.
4. **Fase 3 — Hono adapter**: middleware siap pakai untuk expose endpoint `/rates`, `/track` di atas provider manapun.
5. **Fase 4 (v2) — `createShipment`**: buat pesanan/AWB aktual ke Biteship & Komerce, plus update contract dan webhook untuk status transaksional (pickup, in-transit, delivered, dst).
6. **Fase 5 (v3) — Provider tambahan** (Shipper, KiriminAja) + caching helper opsional (in-memory/Redis adapter untuk cache rate).

## 13. Open questions

- [x] ~~Perlu approach ke tim Biteship/Komerce untuk konfirmasi tidak keberatan ada SDK unofficial?~~ — Di-skip untuk saat ini, bukan blocker. Bisa direvisit setelah v1 rilis.