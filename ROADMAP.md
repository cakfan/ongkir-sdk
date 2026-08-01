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

- [x] `@ongkir-sdk/hono`: setup package, dependency ke core saja (provider-agnostic)
- [x] `middleware.ts`: `createShippingRoutes({ providers, defaultProvider })` → Hono sub-app dengan route `GET /rates`, `GET /track/:id`, `POST /webhooks/:provider`
- [x] Validasi request pakai `zod` di layer route
- [ ] OpenAPI spec otomatis (opsional, kalau pakai `@hono/zod-openapi`) — di-skip untuk v1; revisit kalau docs site jadi
- [x] Example project `examples/hono-api` — server minimal yang mount `BiteshipProvider` + `KomerceProvider`, ganti provider lewat `DEFAULT_PROVIDER`
- [x] `README.md` package `hono`

**Exit criteria:** `bunx` example project jalan, bisa hit `/rates` dan dapat response ternormalisasi dari Biteship maupun Komerce dengan cara ganti satu baris config.

**Hasil validasi live:** `examples/hono-api` jalan dengan `DEFAULT_PROVIDER=komerce` (port env-configurable). `GET /rates` (12440→12240, 1kg) return `RateResult[]` nyata dari API RajaOngkir. Error path terverifikasi lewat REST: `/track` AWB palsu → `TRACKING_NOT_FOUND` (404), tanpa courier → `UNKNOWN` + `MISSING_COURIER`, `/webhooks/biteship` yang tidak terdaftar → `PROVIDER_NOT_FOUND` (404), `/webhooks/komerce` → `WEBHOOK_NOT_SUPPORTED` (501). Catatan: `bun run` auto-serve saat default export adalah Hono app — jangan panggil `serve()` manual di dalam modul yang sama (double listen → EADDRINUSE).

---

## Fase 4 (v2) — `createShipment`

**Tujuan:** SDK bisa dipakai untuk checkout end-to-end, bukan cuma cek ongkir.

- [x] Update `contract.ts`: tambah `createShipment(params: CreateShipmentRequest): Promise<ShipmentResult>` — **wajib** di interface `ShippingProvider`
- [x] Definisikan `CreateShipmentRequest`/`ShipmentResult` di core types (`ShipmentContact`, `ShipmentItem`, `ShipmentStatus`, `ShipmentResult`; `WebhookEvent` + `normalizedStatus`)
- [x] Implementasi di `@ongkir-sdk/biteship` — `POST /v1/orders`, idempotency via `reference_id`, error `400020xx` → `CREATE_SHIPMENT_FAILED`
- [x] Implementasi di `@ongkir-sdk/komerce` — **tidak didukung** pada tier Shipping Cost (order cuma ada di API Shipping Delivery/Enterprise). `createShipment()` throw `CREATE_SHIPMENT_NOT_SUPPORTED`, keterbatasan didokumentasikan di README package
- [x] Update `WebhookEvent` untuk status transaksional (pickup, in-transit, delivered, cancelled) via `normalizedStatus` + `toShipmentStatus` mapper Biteship
- [x] Update contract test suite untuk cover `createShipment` (success shape + invalid request → `ShippingSDKError`; flag `supportsCreateShipment`)
- [x] Dokumentasi jelas soal side-effect: ini benar-benar membuat order ke provider (biaya nyata), beri warning di README
- [x] `@ongkir-sdk/hono`: route `POST /shipments` (201, `VALIDATION_ERROR` 400, `CREATE_SHIPMENT_NOT_SUPPORTED` 501, `CREATE_SHIPMENT_FAILED` 502)

**Exit criteria:** Bisa buat shipment order sungguhan di sandbox Biteship dan terima update status via webhook. Untuk Komerce, exit criteria-nya adalah `createShipment` melempar `CREATE_SHIPMENT_NOT_SUPPORTED` dengan pesan yang menjelaskan batasan tier — order sungguhan tidak feasible di tier Shipping Cost (produk terpisah dengan auth berbeda).

---

## Fase 5 (v3) — Provider tambahan & caching

**Tujuan:** ekspansi ekosistem.

- [x] Evaluasi provider berikutnya (Shipper, KiriminAja) — cek ketersediaan API publik dan ToS-nya (ulangi proses due-diligence seperti Biteship/Komerce)
- [x] `@ongkir-sdk/shipper` (selesai 2026-08); `@ongkir-sdk/kiriminaja` tetap opsional
- [x] Rate caching helper opsional: `@ongkir-sdk/cache-memory` (selesai 2026-08); `@ongkir-sdk/cache-redis` belum dibuat (butuh dependency redis client non Web-standard, pola sama — lihat ARCHITECTURE §11)
- [ ] Evaluasi kebutuhan docs site (VitePress/Starlight) kalau traction sudah cukup — lihat diskusi dokumentasi di PRD

**Hasil due-diligence Shipper (dari logistics-docs.shipper.id):**
- API publik tersedia (logistics v3), auth via header `X-API-Key`, base URL production `https://merchant-api.shipper.id`, sandbox `https://merchant-api-sandbox.shipper.id`. Tidak ditemukan field "affiliate/partnership" yang mengharuskan endorsement — tetap pakai disclaimer unofficial.
- Alur wajib: `GET /v3/location?adm_level=5&keyword=` untuk resolve `area_id` (level kelurahan, keyword min 3 karakter, cocokkan dengan `postcode`/`postcodes`) → `POST /v3/pricing/domestic` (wajib `area_id` origin/destination, `for_order: true`, `length`/`width`/`height`/`weight` (kg)/`item_value`) → `POST /v3/order` (butuh `rate_id` hasil pricing) → `GET /v3/order/{id}` untuk detail + AWB + status tracking.
- Webhook: tersedia, payload memuat `order_id`, `tracking_id`, `awb`, `external_status` (code/name/description), `status_date`. **Tidak ada signature verification** — endpoint harus stateless & open (didokumentasikan di dashboard). Konsekuensi desain: `supportsSignatureVerification: false` (kayak Biteship), keamanan idempotency serahkan ke consumer.
- `createShipment`: contract core hanya bawa `courier` + `service`, tapi Shipper butuh `rate_id` → adapter resolve `rate_id` secara **internal** (re-query pricing, cari `logistic.code`==courier && `rate.name`==service). Keputusan ini **tidak** mengubah `contract.ts` (confirmed 2026-08).
- Status mapping ke `ShipmentStatus`: code 1000 → confirmed, 1001-1044 → pickup, 1050-1190 → in_transit, 1310-1330 → in_transit (exception antar barang, mis. salah alamat/tidak ada penerima), 1360 → pickup (penjemputan dikonfirmasi), 2000+ → delivered, 999 → cancelled, sisanya (termasuk return/fail terminal 1340/1370/1380/1410/1420) → unknown.

**Exit criteria:** `ShipperProvider` lulus semua contract test (`runProviderContractTests`) termasuk `createShipment` (re-query pricing → `POST /v3/order`), `@ongkir-sdk/cache-memory` bisa membungkus provider mana pun dan `getRates()` cache hit tanpa panggil provider ulang. KiriminAja & docs site tetap opsional/later.

---

## Cadence & prioritas

- Tidak ada tanggal fix per fase — proyek ini side project/open source, progress berbasis exit criteria tiap fase, bukan deadline kalender.
- Fase 0–3 adalah **v1 rilis pertama**. Jangan publish ke npm sebagai `1.0.0` sebelum Fase 3 selesai (minimal dua provider + Hono adapter) — supaya first impression SDK ini benar-benar multi-provider, bukan cuma wrapper Biteship.
- Fase 2 (provider kedua) sengaja ditempatkan sebelum Hono adapter karena itu jadi validasi paling penting untuk desain contract di core — kalau nunda ke belakang, risiko refactor besar setelah API publik makin mahal.