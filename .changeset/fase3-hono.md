---
'@ongkir-sdk/hono': minor
---

Implement `createShippingRoutes()` — Hono middleware yang meng-expose satu atau lebih `ShippingProvider` sebagai REST routes:

- `GET /rates` — query `origin`, `destination`, `weight` (+ dimensi/`quantity`/`value` opsional), validasi `zod`.
- `GET /track/:id` — dukungan `?courier=` diteruskan ke `trackShipment`.
- `POST /webhooks/:provider` — pilih adapter dari map lalu panggil `parseWebhook`.
- Semua `ShippingSDKError` dipetakan ke JSON `{ error: {...} }` dengan HTTP status sesuai kode.
- `hono` & `zod` sebagai peerDependencies.

Contoh pemakaian di `examples/hono-api`.
