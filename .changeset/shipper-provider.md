---
'@ongkir-sdk/shipper': minor
---

Fase 5: adapter provider Shipper (`ShipperProvider`).

- `getRates()` — resolve `area_id` via `GET /v3/location` (postal code → area id, hasil di-cache per instance), lalu `POST /v3/pricing/domestic`.
- `createShipment()` — `POST /v3/order`; `rate_id` di-resolve internal lewat re-query pricing (tidak ada perubahan `contract.ts`).
- `trackShipment()` — `GET /v3/order/{id}` (order ID, bukan AWB).
- `parseWebhook()` — tanpa signature verification (`supportsSignatureVerification: false`).
- Lulus `runProviderContractTests()` dari `@ongkir-sdk/core/testing`.
