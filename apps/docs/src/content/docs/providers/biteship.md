---
title: Biteship
description: Adapter Biteship — rates, tracking, webhook, dan pembuatan order pengiriman.
---

> **Unofficial SDK.** Not affiliated with, endorsed by, or officially connected to Biteship.

Adapter untuk cek ongkir (shipping rates), tracking resi, parser webhook, dan pembuatan order pengiriman via API Biteship. Dibangun di atas contract `ShippingProvider` dari `@ongkir-sdk/core`.

## Instalasi

```bash
npm install @ongkir-sdk/biteship
```

## Penggunaan

```ts
import { BiteshipProvider } from '@ongkir-sdk/biteship'

const provider = new BiteshipProvider({ apiKey: process.env.BITESHIP_API_KEY! })

// Cek ongkir
const rates = await provider.getRates({
  origin: { postalCode: '12440' },
  destination: { postalCode: '12240' },
  items: [{ weightGrams: 1000, value: 50000 }],
})

// Tracking
const tracking = await provider.trackShipment('TRACKING_ID')

// Buat order pengiriman
const shipment = await provider.createShipment({
  origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '12440' },
  destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
  items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
  courier: 'jne',
  service: 'reg',
})

// Parse webhook
const event = provider.parseWebhook(payload, headers)
```

## Konfigurasi

| Opsi | Tipe | Default | Deskripsi |
|---|---|---|---|
| `apiKey` | `string` | — | API key Biteship (wajib) |
| `baseUrl` | `string` | `https://api.biteship.com` | API base URL |
| `httpClient` | `function` | `fetch` | HTTP client custom untuk testing |

## Fitur yang didukung

- `getRates()` — via postal code
- `trackShipment()` — via Biteship tracking ID
- `createShipment()` — via orders API (aksi nyata, berpotensi menagih saldo)
- `parseWebhook()` — event `order.status`, `order.price`, `order.waybill_id`

:::caution[`createShipment()` adalah aksi nyata]

Memanggil `createShipment()` membuat order sungguhan ke Biteship dan menagih saldo akun. Idempotent selama memakai `referenceId` yang sama — provider menolak `referenceId` duplikat. Panggil hanya setelah user mengonfirmasi.

:::

## FAQ

**Apakah ini SDK resmi dari Biteship?** Tidak. Ini adapter unofficial untuk SDK open source `ongkir-sdk`, tidak berafiliasi dengan Biteship.

**Butuh API key?** Ya. Pakai key milikmu sendiri, misal key sandbox `biteship_test.*` dari dashboard Testing Mode Biteship.

**Runtime apa yang didukung?** Node ≥18, Bun, Deno, dan Cloudflare Workers.
