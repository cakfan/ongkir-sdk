---
title: Error handling
description: Pola penanganan error ternormalisasi ShippingSDKError di semua provider.
---

Semua provider melempar `ShippingSDKError` — jangan biarkan raw error/response provider bocor ke consumer.

```ts
import { isRetryable, isShippingSDKError } from '@ongkir-sdk/core'

try {
  const rates = await provider.getRates({ origin, destination, items })
} catch (err) {
  if (isShippingSDKError(err)) {
    // err.code, err.message, err.provider, err.retryable, err.providerErrorCode
    if (err.retryable) return retry(provider)
  }
}
```

## Kode error

| `ShippingErrorCode` | Arti |
|---|---|
| `INVALID_ORIGIN` | Origin tidak valid / tidak bisa di-resolve |
| `INVALID_DESTINATION` | Destination tidak valid / tidak bisa di-resolve |
| `RATE_NOT_AVAILABLE` | Tidak ada tarif untuk kombinasi yang diminta |
| `TRACKING_NOT_FOUND` | Nomor resi tidak ditemukan |
| `PROVIDER_AUTH_FAILED` | API key ditolak provider |
| `PROVIDER_RATE_LIMITED` | Kuota/rate limit provider habis |
| `PROVIDER_UNAVAILABLE` | Provider down atau error internal |
| `WEBHOOK_SIGNATURE_INVALID` | Signature webhook tidak cocok |
| `WEBHOOK_NOT_SUPPORTED` | Provider/tier tidak menyediakan webhook |
| `CREATE_SHIPMENT_NOT_SUPPORTED` | Provider/tier tidak mendukung pembuatan order |
| `CREATE_SHIPMENT_FAILED` | Provider menolak order pengiriman |
| `UNKNOWN` | Error lain yang belum terklasifikasi |

## Helper

- `isShippingSDKError(err)` — guard type untuk membedakan error SDK dari error lain.
- `isRetryable(err)` — keputusan retry cepat (memeriksa `err.retryable`).
- `SHIPPING_ERROR_CODES` — daftar lengkap kode error.
