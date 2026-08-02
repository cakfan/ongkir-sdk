# @ongkir-sdk/core

## 2.0.2

### Patch Changes

- docs: README kini menautkan docsite live (https://cakfan.github.io/ongkir-sdk/) — badge + section Documentation di root README, dan section "Dokumentasi" di README tiap package dengan link ke halaman API reference masing-masing.

## 2.0.1

### Patch Changes

- d042643: SEO: metadata npm & README dioptimasi agar package lebih mudah ditemukan lewat pencarian (termasuk Google).

  - `keywords` dan `homepage` ditambahkan di `package.json`; `description` ditulis ulang dengan kata kunci pencarian (ongkir, shipping rates, tracking, nama provider).
  - README tiap package: paragraf intro lebih kaya kata kunci + section FAQ (status resmi/unofficial, bring-your-own-key, dukungan runtime, kasus khusus provider).
  - Root README: tambah section "Features" terstruktur.

## 2.0.0

### Major Changes

- 7a9eaa5: **Fase 4 (v2): `createShipment`** — SDK kini bisa membuat order pengiriman, bukan cuma cek ongkir.

  ### `@ongkir-sdk/core` (breaking)

  - `ShippingProvider.createShipment(params: CreateShipmentRequest): Promise<ShipmentResult>` kini **wajib** (sebelumnya tidak ada). Adapter yang tidak mendukung wajib melempar error `CREATE_SHIPMENT_NOT_SUPPORTED`, bukan tidak mengimplementasi method.
  - Tipe baru: `CreateShipmentRequest`, `ShipmentContact`, `ShipmentItem`, `ShipmentStatus` (`confirmed | pickup | in_transit | delivered | cancelled | unknown`), `ShipmentResult` (wajib `orderId`, plus `awb?`, `trackingId?`, `service`, `status`, `normalizedStatus?`, `cost`, `currency`).
  - `WebhookEvent` bertambah `normalizedStatus?: ShipmentStatus`.
  - Error code baru: `CREATE_SHIPMENT_NOT_SUPPORTED`, `CREATE_SHIPMENT_FAILED`.
  - Contract test suite: opsi `supportsCreateShipment` + test `createShipment` (success shape + invalid request → `ShippingSDKError`), helper `sampleCreateShipmentRequest()`.

  ### `@ongkir-sdk/biteship`

  - `createShipment()` → `POST /v1/orders`. Idempotency via `referenceId` (dikirim sebagai `reference_id`), support `cashOnDelivery`, error `400020xx` di-map ke `CREATE_SHIPMENT_FAILED`. Webhook kini menyertakan `normalizedStatus`.

  ### `@ongkir-sdk/komerce`

  - `createShipment()` melempar `CREATE_SHIPMENT_NOT_SUPPORTED` — tier RajaOngkir Shipping Cost tidak menyediakan API order (order hanya ada di produk terpisah Shipping Delivery/Enterprise).

  ### `@ongkir-sdk/hono`

  - Route baru `POST /shipments` (validasi zod, 201 saat berhasil, 400 `VALIDATION_ERROR`, 501 `CREATE_SHIPMENT_NOT_SUPPORTED`, 502 `CREATE_SHIPMENT_FAILED`).

## 1.0.1

### Patch Changes

- 383b753: docs: tambah README package core (halaman npm sebelumnya kosong)

## 1.0.0

### Major Changes

- a30df8d: Add `@ongkir-sdk/komerce` adapter (unofficial RajaOngkir API V2 by Komerce): getRates (postal-code based), trackShipment (requires courier code), webhook not supported in the target tier.

  Core contract additions (backward compatible):

  - `trackShipment(trackingId, options?: TrackShipmentOptions)` — new optional `courier` option for providers whose tracking API requires a courier code (RajaOngkir). Existing adapters ignore it.
  - New error code `WEBHOOK_NOT_SUPPORTED` for providers without webhook support in the targeted account tier.
  - Contract test suite: `ContractTestConfig.supportsWebhooks` flag (default true) to skip webhook tests for such providers.
