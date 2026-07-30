# ROADMAP — ongkir-sdk

Referensi: `PRD.md`, `ARCHITECTURE.md`

---

## Fase 0 — Fondasi

**Tujuan:** monorepo siap, contract stabil, resolver wilayah jalan.

- [ ] Setup monorepo (Bun workspaces) + `tsconfig.base.json`, lint/format config
- [ ] Setup Changesets untuk versioning independen
- [ ] `@ongkir-sdk/core`: definisikan `types.ts` (`RateRequest`, `RateResult`, `TrackingResult`, `WebhookEvent`, `RegionRef`)
- [ ] `@ongkir-sdk/core`: definisikan `contract.ts` (interface `ShippingProvider`)
- [ ] `@ongkir-sdk/core`: `errors.ts` (`ShippingSDKError`, `ShippingErrorCode` enum, `isRetryable()`, `isShippingSDKError()`)
- [ ] `@ongkir-sdk/core`: region resolver — HTTP client ke `api-wilayah-indonesia` + in-memory cache dengan TTL
- [ ] `@ongkir-sdk/core/testing`: `runProviderContractTests()` — shared contract test suite
- [ ] Deploy instance `api-wilayah-indonesia` (pilih hosting, isi `.env`, jalankan `bun run build-data`)
- [ ] CI dasar: lint, typecheck, test di GitHub Actions
- [ ] `README.md` root — overview monorepo + disclaimer unofficial

**Exit criteria:** `@ongkir-sdk/core` bisa di-import, contract test suite jalan (walau belum ada provider), resolver wilayah bisa resolve nama kota → `RegionRef`.

---

## Fase 1 — Provider Biteship

**Tujuan:** provider pertama lengkap read-only (rate, tracking, webhook).

- [ ] `@ongkir-sdk/biteship`: setup package, dependency ke core
- [ ] `mapper.ts`: `RateRequest` (core) → format request Biteship, response Biteship → `RateResult[]`
- [ ] `mapper.ts`: `toBiteshipAreaId(RegionRef)` — mapping wilayah ke area_id Biteship
- [ ] `adapter.ts`: implementasi `getRates()`
- [ ] `adapter.ts`: implementasi `trackShipment()`
- [ ] `adapter.ts`: implementasi `parseWebhook()` + verifikasi signature (kalau Biteship sediakan)
- [ ] `errors.ts`: map error/status code Biteship → `ShippingErrorCode`
- [ ] Fixture response asli Biteship di `__fixtures__/` (sandbox atau dari dokumentasi)
- [ ] Unit test mapper + jalankan `runProviderContractTests()` untuk `BiteshipProvider`
- [ ] `README.md` package `biteship`

**Exit criteria:** `BiteshipProvider` lulus semua contract test, bisa dipakai end-to-end di example project dengan API key sandbox.

---

## Fase 2 — Provider Komerce

**Tujuan:** provider kedua, validasi bahwa contract benar-benar provider-agnostic.

- [ ] `@ongkir-sdk/komerce`: setup package
- [ ] `mapper.ts` + `toKomerceCode(RegionRef)`
- [ ] `adapter.ts`: `getRates()`, `trackShipment()`
- [ ] `parseWebhook()` — cek dulu apakah tier akun yang ditarget support webhook; kalau tidak, dokumentasikan keterbatasannya jelas di README
- [ ] `errors.ts`: map error Komerce → `ShippingErrorCode`
- [ ] Fixture + unit test + `runProviderContractTests()` untuk `KomerceProvider`
- [ ] **Cross-check**: apakah ada field/behaviour di Biteship adapter yang ternyata provider-specific dan bocor ke core? Refactor contract kalau perlu (ini fase paling penting untuk validasi desain core).
- [ ] `README.md` package `komerce`

**Exit criteria:** Dua provider lulus contract test yang sama tanpa modifikasi core. Kalau butuh modifikasi core, berarti Fase 0 desainnya kurang generic — catat sebagai pelajaran sebelum lanjut.

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