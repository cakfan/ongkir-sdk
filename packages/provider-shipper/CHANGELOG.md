# @ongkir-sdk/shipper

## 0.2.1

### Patch Changes

- docs: README kini menautkan docsite live (https://cakfan.github.io/ongkir-sdk/) — badge + section Documentation di root README, dan section "Dokumentasi" di README tiap package dengan link ke halaman API reference masing-masing.
- Updated dependencies
  - @ongkir-sdk/core@2.0.2

## 0.2.0

### Minor Changes

- 31f7e1d: Fase 5: adapter provider Shipper (`ShipperProvider`).

  - `getRates()` — resolve `area_id` via `GET /v3/location` (postal code → area id, hasil di-cache per instance), lalu `POST /v3/pricing/domestic`.
  - `createShipment()` — `POST /v3/order`; `rate_id` di-resolve internal lewat re-query pricing (tidak ada perubahan `contract.ts`). COD (`cashOnDelivery`) mengirim `courier.cod_amount` dan re-query pricing dengan `cod: true`; `use_insurance` mengikuti `must_use_insurance` dari pricing.
  - `trackShipment()` — `GET /v3/order/{id}` (order ID, bukan AWB).
  - `parseWebhook()` — tanpa signature verification (`supportsSignatureVerification: false`).
  - Mapping status ternormalisasi: 1310-1330 (exception antar) → in_transit, 1360 (penjemputan dikonfirmasi) → pickup, return/fail terminal (1340/1370/1380/1410/1420) → unknown.
  - Lulus `runProviderContractTests()` dari `@ongkir-sdk/core/testing`.

### Patch Changes

- d042643: SEO: metadata npm & README dioptimasi agar package lebih mudah ditemukan lewat pencarian (termasuk Google).

  - `keywords` dan `homepage` ditambahkan di `package.json`; `description` ditulis ulang dengan kata kunci pencarian (ongkir, shipping rates, tracking, nama provider).
  - README tiap package: paragraf intro lebih kaya kata kunci + section FAQ (status resmi/unofficial, bring-your-own-key, dukungan runtime, kasus khusus provider).
  - Root README: tambah section "Features" terstruktur.

- Updated dependencies [d042643]
  - @ongkir-sdk/core@2.0.1
