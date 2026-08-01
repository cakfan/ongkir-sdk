# Live test manual — Komerce (RajaOngkir)

Test pakai API key asli. Tidak dijalankan oleh CI (`bun test`/`bun run test` mengabaikan folder ini).

## Prasyarat

- `.env` di root repo berisi `RAJAONGKIR_API_KEY=<key>`.
- `dist/` package `@ongkir-sdk/core` dan `@ongkir-sdk/komerce` sudah di-build (`bun run build`).

## Cara menjalankan

```sh
bun run packages/provider-komerce/manual/live.ts
```

Script menjalankan:
- `getRates` (postal 12440 → 40111, 1000 g) — resolusi lokasi via `destination/domestic-destination`, lalu hitung ongkir.
- `trackShipment` dengan AWB palsu (`courier: "jne"`) — mengharapkan `ShippingSDKError` `TRACKING_NOT_FOUND` sebagai verifikasi auth + normalisasi error.
