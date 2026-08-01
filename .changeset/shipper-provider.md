---
'@ongkir-sdk/shipper': minor
---

Fase 5: adapter provider Shipper (`ShipperProvider`).

- `getRates()` — resolve `area_id` via `GET /v3/location` (postal code → area id, hasil di-cache per instance), lalu `POST /v3/pricing/domestic`.
- `createShipment()` — `POST /v3/order`; `rate_id` di-resolve internal lewat re-query pricing (tidak ada perubahan `contract.ts`). COD (`cashOnDelivery`) mengirim `courier.cod_amount` dan re-query pricing dengan `cod: true`; `use_insurance` mengikuti `must_use_insurance` dari pricing.
- `trackShipment()` — `GET /v3/order/{id}` (order ID, bukan AWB).
- `parseWebhook()` — tanpa signature verification (`supportsSignatureVerification: false`).
- Mapping status ternormalisasi: 1310-1330 (exception antar) → in_transit, 1360 (penjemputan dikonfirmasi) → pickup, return/fail terminal (1340/1370/1380/1410/1420) → unknown.
- Lulus `runProviderContractTests()` dari `@ongkir-sdk/core/testing`.
