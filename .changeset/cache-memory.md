---
'@ongkir-sdk/cache-memory': minor
---

Fase 5: paket baru `@ongkir-sdk/cache-memory` — wrapper in-memory untuk `ShippingProvider` apa pun.

- `MemoryCacheProvider` mengimplementasikan `ShippingProvider`, bisa dipakai di tempat yang sama (termasuk `@ongkir-sdk/hono`).
- Hanya `getRates()` yang di-cache; `trackShipment`/`createShipment`/`parseWebhook` selalu diteruskan.
- TTL default 5 menit (`ttlMs`), `0` mematikan cache; entri di-evict otomatis setelah TTL lewat (timer); `clear()` untuk reset manual.
