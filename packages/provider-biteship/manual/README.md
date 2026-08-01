# Live test manual — Biteship

Test pakai API key asli. Tidak dijalankan oleh CI (`bun test`/`bun run test` mengabaikan folder ini).

## Prasyarat

- `.env` di root repo berisi `BITESHIP_API_KEY=<key>`.
- `dist/` package `@ongkir-sdk/core` dan `@ongkir-sdk/biteship` sudah di-build (`bun run build`).

## Cara menjalankan

```sh
bun run packages/provider-biteship/manual/live.ts
```

Script menjalankan:
- `getRates` (postal 12440 → 40111, 1000 g) dan menampilkan daftar rate.
- `trackShipment` dengan AWB palsu — mengharapkan `ShippingSDKError` `TRACKING_NOT_FOUND` sebagai verifikasi auth + normalisasi error.
