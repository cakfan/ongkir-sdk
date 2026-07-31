# ROADMAP — ongkir-sdk

Referensi: `PRD.md`, `ARCHITECTURE.md`

---

## Fase 0 — Fondasi

**Tujuan:** monorepo siap, contract stabil, resolver wilayah jalan.

- [x] Setup monorepo (Bun workspaces) + `tsconfig.base.json`, lint/format config
- [x] Setup Changesets untuk versioning independen
- [x] `@ongkir-sdk/core`: definisikan `types.ts` (`RateRequest`, `RateResult`, `TrackingResult`, `WebhookEvent`, `RegionRef`)
- [x] `@ongkir-sdk/core`: definisikan `contract.ts` (interface `ShippingProvider`)
- [x] `@ongkir-sdk/core`: `errors.ts` (`ShippingSDKError`, `ShippingErrorCode` enum, `isRetryable()`, `isShippingSDKError()`)
- [x] `@ongkir-sdk/core`: region resolver — HTTP client ke `api-wilayah-indonesia` + in-memory cache dengan TTL
- [x] `@ongkir-sdk/core/testing`: `runProviderContractTests()` — shared contract test suite
- [x] Deploy instance `api-wilayah-indonesia` (pilih hosting, isi `.env`, jalankan `bun run build-data`) — Vercel, dokumentasi di `docs/deployment.md`
- [x] CI dasar: lint, typecheck, test di GitHub Actions
- [x] `README.md` root — overview monorepo + disclaimer unofficial

**Exit criteria:** `@ongkir-sdk/core` bisa di-import, contract test suite jalan (walau belum ada provider), resolver wilayah bisa resolve nama kota → `RegionRef`.

---

## Fase 1 — Provider Biteship

**Tujuan:** provider pertama lengkap read-only (rate, tracking, webhook).

- [x] `@ongkir-sdk/biteship`: setup package, dependency ke core
- [x] `mapper.ts`: `RateRequest` (core) → format request Biteship, response Biteship → `RateResult[]`
- [x] `mapper.ts`: `toBiteshipAreaId(RegionRef)` — stub; rate check pakai postal code (tanpa area_id)
- [x] `adapter.ts`: implementasi `getRates()`
- [x] `adapter.ts`: implementasi `trackShipment()`
- [x] `adapter.ts`: implementasi `parseWebhook()` + verifikasi signature (Biteship tidak sediakan signature → di-skip, `supportsSignatureVerification: false` di contract test)
- [x] `errors.ts`: map error/status code Biteship → `ShippingErrorCode`
- [x] Fixture response asli Biteship di `__fixtures__/` (dari dokumentasi)
- [x] Unit test mapper + jalankan `runProviderContractTests()` untuk `BiteshipProvider`
- [x] `README.md` package `biteship`

**Exit criteria:** `BiteshipProvider` lulus semua contract test, bisa dipakai end-to-end di example project dengan API key sandbox.

---

## Fase 2 — Provider Komerce

**Tujuan:** provider kedua, validasi bahwa contract benar-benar provider-agnostic.

- [x] `@ongkir-sdk/komerce`: setup package
- [x] `mapper.ts` + `toKomerceCode(RegionRef)`
- [x] `adapter.ts`: `getRates()`, `trackShipment()`
- [x] `parseWebhook()` — tier Shipping Cost (target v1, termasuk Starter gratis) tidak support webhook; webhook cuma ada di API Shipping Delivery (Enterprise). `parseWebhook()` throw `WEBHOOK_NOT_SUPPORTED`, keterbatasan didokumentasikan di README package
- [x] `errors.ts`: map error Komerce → `ShippingErrorCode`
- [x] Fixture + unit test + `runProviderContractTests()` untuk `KomerceProvider`
- [x] **Cross-check**: 
  - `trackShipment(trackingId)` → ditambah `options?: { courier?: string }` karena RajaOngkir butuh kode kurir (Biteship tidak). Backward-compatible, Biteship mengabaikan option.
  - Region mapping: RajaOngkir tidak punya ID statis yang bisa di-bundle → `toKomerceCode` jadi lookup dinamis via endpoint search (postal code, di-cache). Berarti adapter butuh postal code di `RegionRef` — keterbatasan ini dicatat di README, bukan bocor ke core.
  - `RateResult.provider` di Komerce = kode kurir (`jne`), konsisten dengan makna "courier identity" di Biteship. Tidak ada field provider-specific yang bocor ke core.
- [x] `README.md` package `komerce`

**Exit criteria:** Dua provider lulus contract test yang sama tanpa modifikasi core. Kalau butuh modifikasi core, berarti Fase 0 desainnya kurang generic — catat sebagai pelajaran sebelum lanjut.

**Hasil validasi live (RajaOngkir by Komerce):** `getRates` 12440 → 12240 (1 kg) return **50 opsi rate** (wahana, sicepat, tiki, pos, rex, ninja, dll) tanpa bug mapping. Error path terverifikasi: AWB palsu → `TRACKING_NOT_FOUND` ("Invalid Awb"), `trackShipment` tanpa courier → `UNKNOWN` + `providerErrorCode: MISSING_COURIER` dengan pesan yang menuntun pemakai. Example `node-basic` sekarang dual-provider (`PROVIDER=biteship|komerce`).

---

## Fase 3 — Hono adapter

**Tujuan:** siap dipakai langsung sebagai REST endpoint di project Hono (termasuk dogfooding di boilerplate/Ichimart kalau relevan).

- [ ] `@ongkir-sdk/hono`: setup package, dependency ke core saja (provider-agnostic)
- [ ] `middleware.ts`: `createShippingRoutes(provider: ShippingProvider)` → Hono sub-app dengan route `GET /rates`, `GET /track/:id`, `POST /webhooks/:provider`
- [ ] Validasi request pakai `zod` di layer route
- [ ] OpenAPI spec otomatis (opsional, kalau pakai `@hono/zod-openapi`)
- [ ] Example project `examples/hono-api` — server minimal yang pasang `BiteshipProvider` + route
- [ ] `README.md` package `hono`

**Exit criteria:** `bunx` example project jalan, bisa hit `/rates` dan dapat response ternormalisasi dari Biteship maupun Komerce dengan cara ganti satu baris config.

---

## Fase 4 (v2) — `createShipment`

**Tujuan:** SDK bisa dipakai untuk checkout end-to-end, bukan cuma cek ongkir.

- [ ] Update `contract.ts`: tambah `createShipment(params: CreateShipmentRequest): Promise<ShipmentResult>`
- [ ] Definisikan `CreateShipmentRequest`/`ShipmentResult` di core types
- [ ] Implementasi di `@ongkir-sdk/biteship`
- [ ] Implementasi di `@ongkir-sdk/komerce` (cek batasan tier akun)
- [ ] Update `WebhookEvent` untuk status transaksional (pickup, in-transit, delivered, cancelled)
- [ ] Update contract test suite untuk cover `createShipment`
- [ ] Dokumentasi jelas soal side-effect: ini benar-benar membuat order ke provider (biaya nyata), beri warning di README

**Exit criteria:** Bisa buat shipment order sungguhan di sandbox kedua provider dan terima update status via webhook.

---

## Fase 5 (v3) — Provider tambahan & caching

**Tujuan:** ekspansi ekosistem.

- [ ] Evaluasi provider berikutnya (Shipper, KiriminAja) — cek ketersediaan API publik dan ToS-nya (ulangi proses due-diligence seperti Biteship/Komerce)
- [ ] `@ongkir-sdk/shipper` dan/atau `@ongkir-sdk/kiriminaja`
- [ ] Rate caching helper opsional: `@ongkir-sdk/cache-memory`, `@ongkir-sdk/cache-redis` — wrap provider dengan cache layer tanpa ubah contract
- [ ] Evaluasi kebutuhan docs site (VitePress/Starlight) kalau traction sudah cukup — lihat diskusi dokumentasi di PRD

---

## Cadence & prioritas

- Tidak ada tanggal fix per fase — proyek ini side project/open source, progress berbasis exit criteria tiap fase, bukan deadline kalender.
- Fase 0–3 adalah **v1 rilis pertama**. Jangan publish ke npm sebagai `1.0.0` sebelum Fase 3 selesai (minimal dua provider + Hono adapter) — supaya first impression SDK ini benar-benar multi-provider, bukan cuma wrapper Biteship.
- Fase 2 (provider kedua) sengaja ditempatkan sebelum Hono adapter karena itu jadi validasi paling penting untuk desain contract di core — kalau nunda ke belakang, risiko refactor besar setelah API publik makin mahal.