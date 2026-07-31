# @ongkir-sdk/biteship

## 1.1.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [7a9eaa5]
  - @ongkir-sdk/core@2.0.0

## 1.0.0

### Major Changes

- Release v1: provider Biteship (rates, tracking, webhook parser) sudah stabil dan lolos contract test suite bersama provider Komerce serta adaptor Hono. Initial public release.

### Patch Changes

- Updated dependencies [a30df8d]
  - @ongkir-sdk/core@1.0.0
