# example-hono-api

Contoh REST API dengan `@ongkir-sdk/hono` — mount `createShippingRoutes()` di atas Hono, provider dipilih lewat env. Ganti provider cukup ubah satu baris config (`DEFAULT_PROVIDER`).

## Cara jalan

```bash
# Set minimal satu API key
export BITESHIP_API_KEY=biteship_test.xxxxx
export RAJAONGKIR_API_KEY=xxxxxxxx

# Opsional: pilih provider default untuk /rates & /track (default: satu-satunya yang terdaftar)
export DEFAULT_PROVIDER=komerce

# Jalankan
bun run start
```

## Endpoint

```bash
# Cek ongkir (postal code, berat dalam gram)
curl "http://localhost:3000/rates?origin=12440&destination=12240&weight=1000"

# Tracking (courier wajib untuk provider Komerce/RajaOngkir)
curl "http://localhost:3000/track/AWB001?courier=jne"

# Webhook masuk (di-parse sesuai provider di URL)
curl -X POST http://localhost:3000/webhooks/biteship \
  -H "content-type: application/json" \
  -d '{"id":"evt_1","status":"delivered"}'
```

> Server ini **tidak** dijalankan di CI — butuh API key asli. Test yang jalan di CI memakai `app.request()` langsung dengan provider mock (`packages/hono/src/middleware.test.ts`).
