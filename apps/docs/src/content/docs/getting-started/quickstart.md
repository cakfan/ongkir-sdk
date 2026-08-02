---
title: Quickstart
description: Contoh cepat cek ongkir dan tracking pengiriman pakai ongkir-sdk.
---

Contoh ini memakai `KomerceProvider`, tapi semua provider berbagi contract `ShippingProvider` yang sama — ganti provider tinggal ganti satu baris config.

```ts
import { BiteshipProvider } from '@ongkir-sdk/biteship'
import { KomerceProvider } from '@ongkir-sdk/komerce'
import { ShipperProvider } from '@ongkir-sdk/shipper'

const provider = new KomerceProvider({ apiKey: process.env.RAJAONGKIR_API_KEY! })

const rates = await provider.getRates({
  origin: { postalCode: '12440' },
  destination: { postalCode: '12240' },
  items: [{ weightGrams: 1000, value: 199000, quantity: 1 }],
})

const tracking = await provider.trackShipment('AWB001', { courier: 'jne' })
```

Provider Shipper memakai flow yang sama, tapi wajib `postalCode` di `origin`/`destination` (`area_id` di-resolve otomatis oleh adapter):

```ts
const shipper = new ShipperProvider({ apiKey: process.env.SHIPPER_API_KEY! })

const shipperRates = await shipper.getRates({
  origin: { postalCode: '10110' },
  destination: { postalCode: '40111' },
  items: [{ weightGrams: 1000, value: 50000, quantity: 1 }],
})
```

## Error handling

Semua error provider dinormalisasi ke `ShippingSDKError`. Gunakan `isShippingSDKError()` untuk guard type dan `retryable` untuk keputusan retry.

```ts
import { isShippingSDKError } from '@ongkir-sdk/core'

try {
  const rates = await provider.getRates({ origin, destination, items })
} catch (err) {
  if (isShippingSDKError(err) && err.retryable) {
    // coba lagi — misal kuota provider sedang habis
    return retry()
  }
}
```

Selengkapnya di [Error handling](/guides/errors/).

## Contoh lengkap

- [`examples/node-basic`](https://github.com/cakfan/ongkir-sdk/tree/main/examples/node-basic) — contoh SDK langsung
- [`examples/hono-api`](https://github.com/cakfan/ongkir-sdk/tree/main/examples/hono-api) — contoh REST API pakai Hono
