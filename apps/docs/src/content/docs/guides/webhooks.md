---
title: Webhooks
description: Memparse notifikasi status pengiriman dari provider ke WebhookEvent ternormalisasi.
---

Provider mengirim notifikasi status pengiriman ke endpoint kamu. `parseWebhook()` mengubah payload mentah provider menjadi `WebhookEvent` ternormalisasi.

```ts
const event = provider.parseWebhook(payload, headers)
// {
//   id: string
//   provider: 'biteship' | 'komerce' | 'shipper'
//   type: string
//   trackingId: string
//   status: string
//   normalizedStatus?: ShipmentStatus
//   timestamp: string
//   rawPayload: unknown
// }
```

## Dukungan per provider

| Provider | Webhook | Signature verification |
|---|---|---|
| Biteship | ✅ | ❌ |
| Shipper | ✅ | ❌ |
| Komerce (tier Shipping Cost) | ❌ `WEBHOOK_NOT_SUPPORTED` | — |

Provider yang tidak menyediakan webhook di tier akun yang ditarget tetap mengimplementasikan `parseWebhook`, tapi melempar `ShippingSDKError` dengan code `WEBHOOK_NOT_SUPPORTED`.

## Implikasi tanpa signature verification

Biteship dan Shipper tidak menyediakan verifikasi signature — endpoint webhook harus stateless & open (dijelaskan di dashboard provider masing-masing). Keamanan idempotency diserahkan ke consumer: pastikan endpoint kamu idempotent terhadap event duplikat (misal lewat `event.id` atau `event.trackingId`).
