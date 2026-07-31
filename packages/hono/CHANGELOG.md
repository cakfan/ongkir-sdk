# @ongkir-sdk/hono

## 1.0.0

### Major Changes

- d22e777: Implement `createShippingRoutes()` — Hono middleware yang meng-expose satu atau lebih `ShippingProvider` sebagai REST routes:

  - `GET /rates` — query `origin`, `destination`, `weight` (+ dimensi/`quantity`/`value` opsional), validasi `zod`.
  - `GET /track/:id` — dukungan `?courier=` diteruskan ke `trackShipment`.
  - `POST /webhooks/:provider` — pilih adapter dari map lalu panggil `parseWebhook`.
  - Semua `ShippingSDKError` dipetakan ke JSON `{ error: {...} }` dengan HTTP status sesuai kode.
  - `hono` & `zod` sebagai peerDependencies.

  Contoh pemakaian di `examples/hono-api`.

### Patch Changes

- Updated dependencies [a30df8d]
  - @ongkir-sdk/core@1.0.0
