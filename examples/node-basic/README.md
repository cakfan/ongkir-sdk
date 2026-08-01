# example-node-basic

Contoh pemakaian SDK untuk validasi manual end-to-end dengan tiga provider (butuh API key asli). Script ini memakai provider berdasarkan env `PROVIDER`.

## Cara jalan

```bash
# Provider Biteship (sandbox key biteship_test.* dari dashboard Testing Mode)
export PROVIDER=biteship
export BITESHIP_API_KEY=biteship_test.xxxxx

# Provider Komerce (RajaOngkir by Komerce, key dari rajaongkir.com)
export PROVIDER=komerce
export RAJAONGKIR_API_KEY=xxxxxxxx

# Provider Shipper (key dari dashboard Shipper; opsional SHIPPER_BASE_URL untuk sandbox)
export PROVIDER=shipper
export SHIPPER_API_KEY=xxxxxxxx
export SHIPPER_BASE_URL=https://merchant-api-sandbox.shipper.id

# Cek rates (postal code Jakarta Barat → Jakarta Barat)
bun run start

# Cek tracking (opsional; courier wajib untuk komerce, misal jne)
bun run start <trackingId> [courier]
```

> Script ini **tidak** dijalankan di CI - butuh API key asli. Test yang jalan di CI memakai mock client (`packages/provider-*/src/adapter.test.ts`).
