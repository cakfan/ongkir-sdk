---
title: Testing contract
description: Uji adapter provider pakai suite contract bersama runProviderContractTests.
---

`runProviderContractTests()` dari `@ongkir-sdk/core/testing` menjalankan suite contract yang sama untuk semua adapter. Kalau adapter lulus suite ini, consumer yakin bisa ganti provider tanpa mengubah kode.

Suite ini butuh runner `bun test` dan provider yang di-mock — tidak ada live call ke API provider.

```ts
import { describe } from 'bun:test'
import { runProviderContractTests } from '@ongkir-sdk/core/testing'
import { MyProvider } from './provider'

describe('MyProvider', () => {
  runProviderContractTests({
    createProvider: () => new MyProvider({ apiKey: 'YOUR_API_KEY' }),
    validTrackingId: 'JNE001234567890',
    supportsSignatureVerification: false,
    supportsWebhooks: false,
    // true → suite juga mengetes createShipment (success + invalid request)
    supportsCreateShipment: true,
  })
})
```

Provider yang tidak support fitur tertentu (webhook, create shipment) menyatakan lewat flag yang sesuai — test terkait akan di-skip, bukan gagal.

## Best practice

- Unit test mapper (request/response transform) ditulis terpisah dari contract test.
- Jangan menambahkan test yang butuh API key asli/live call di suite yang jalan di CI. Kalau perlu integration test manual, taruh di folder `manual/` package dengan nama file **bukan** berakhiran `.test.ts` — `bun test` ikut men-scan glob `*.test.ts`.
- Fixture response provider disimpan di `__fixtures__/`, bukan di-generate on-the-fly dari live call.
