# example-node-basic

Contoh pemakaian `@ongkir-sdk/biteship` untuk validasi manual end-to-end (butuh API key sandbox asli).

## Cara jalan

```bash
# 1. Set API key sandbox Biteship (biteship_test.*) dari dashboard Testing Mode
export BITESHIP_API_KEY=biteship_test.xxxxx

# 2. Cek rates (postal code Jakarta Selatan → Jakarta Selatan)
bun run start

# 3. Cek tracking (opsional, butuh tracking ID dari order sandbox)
bun run start <trackingId>
```

> Script ini **tidak** dijalankan di CI — butuh API key asli. Test yang jalan di CI memakai mock client (`packages/provider-biteship/src/adapter.test.ts`).
