# @ongkir-sdk/cache-memory

## 0.2.0

### Minor Changes

- 31f7e1d: Fase 5: paket baru `@ongkir-sdk/cache-memory` — wrapper in-memory untuk `ShippingProvider` apa pun.

  - `MemoryCacheProvider` mengimplementasikan `ShippingProvider`, bisa dipakai di tempat yang sama (termasuk `@ongkir-sdk/hono`).
  - Hanya `getRates()` yang di-cache; `trackShipment`/`createShipment`/`parseWebhook` selalu diteruskan.
  - TTL default 5 menit (`ttlMs`), `0` mematikan cache; entri di-evict otomatis setelah TTL lewat (timer); `clear()` untuk reset manual.

### Patch Changes

- d042643: SEO: metadata npm & README dioptimasi agar package lebih mudah ditemukan lewat pencarian (termasuk Google).

  - `keywords` dan `homepage` ditambahkan di `package.json`; `description` ditulis ulang dengan kata kunci pencarian (ongkir, shipping rates, tracking, nama provider).
  - README tiap package: paragraf intro lebih kaya kata kunci + section FAQ (status resmi/unofficial, bring-your-own-key, dukungan runtime, kasus khusus provider).
  - Root README: tambah section "Features" terstruktur.

- Updated dependencies [d042643]
  - @ongkir-sdk/core@2.0.1
