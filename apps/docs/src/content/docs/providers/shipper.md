---
title: Shipper
description: Adapter Shipper (logistics v3) — rates, tracking, webhook, dan pembuatan order pengiriman.
---

> **Unofficial SDK.** Not affiliated with, endorsed by, or officially connected to Shipper.

Adapter untuk cek ongkir (shipping rates), tracking, parser webhook, dan pembuatan order pengiriman via API Shipper (logistics v3). Dibangun di atas contract `ShippingProvider` dari `@ongkir-sdk/core`.

## Instalasi

```bash
npm install @ongkir-sdk/shipper
```

## Penggunaan

```ts
import { ShipperProvider } from '@ongkir-sdk/shipper'

const provider = new ShipperProvider({ apiKey: process.env.SHIPPER_API_KEY! })

// Cek ongkir — wajib postalCode di origin/destination
const rates = await provider.getRates({
  origin: { postalCode: '10110' },
  destination: { postalCode: '40111' },
  items: [{ weightGrams: 1000, lengthCm: 10, widthCm: 10, heightCm: 10, value: 50000 }],
})

// Tracking — pakai Shipper order ID, bukan nomor resi
const tracking = await provider.trackShipment('ORDER_ID')

// Buat order pengiriman
const shipment = await provider.createShipment({
  origin: { name: 'Toko Sumber', phone: '081234567890', address: 'Jl. Raya Sudirman No. 1', postalCode: '10110' },
  destination: { name: 'Budi', phone: '081298765432', address: 'Jl. Merdeka No. 2', postalCode: '12240' },
  items: [{ name: 'Kaos Polos', weightGrams: 1000, value: 50000, quantity: 1 }],
  courier: 'JNE',
  service: 'REG',
})

// Parse webhook
const event = provider.parseWebhook(payload, headers)
```

:::note[Postal code wajib]

API pricing Shipper butuh `area_id` level kelurahan. Adapter me-resolve-nya otomatis dari postal code via Location API dan meng-cache hasilnya in-memory, jadi `postalCode` **wajib** ada di `origin`/`destination`. `trackShipment()` menerima Shipper order ID, bukan nomor AWB.

:::

## Konfigurasi

| Opsi | Tipe | Default | Deskripsi |
|---|---|---|---|
| `apiKey` | `string` | — | API key Shipper (header `X-API-Key`) |
| `baseUrl` | `string` | `https://merchant-api.shipper.id` | API base URL (sandbox: `https://merchant-api-sandbox.shipper.id`) |
| `httpClient` | `function` | `fetch` | HTTP client custom untuk testing |

## Fitur yang didukung

- `getRates()` — via postal code → lookup `area_id` + domestic pricing
- `trackShipment()` — via Shipper order ID (`GET /v3/order/{id}`)
- `createShipment()` — re-query pricing untuk resolve `rate_id` yang cocok dengan `courier` + `service`, lalu `POST /v3/order`
- `parseWebhook()` — event status dari `external_status`; Shipper tidak menyediakan verifikasi signature webhook

## Bagaimana `createShipment` me-resolve `rate_id`

API create-order Shipper butuh `rate_id` dari response pricing, sedangkan contract `ongkir-sdk` hanya membawa `courier` + `service`. Adapter memanggil `POST /v3/pricing/domestic` secara internal, mencari rate yang logistic code-nya cocok dengan `courier` dan nama rate cocok dengan `service`, lalu mengirim `rate.id`-nya ke `POST /v3/order`. Tidak ada perubahan contract yang diperlukan.

### COD

Kalau `cashOnDelivery` diberikan, re-query pricing dijalankan dengan `cod: true` dan body order membawa `courier.cod: true` plus `courier.cod_amount` (dibutuhkan Shipper agar order dianggap COD).

### Asuransi

Shipper mewajibkan `use_insurance: true` saat rate punya flag `must_use_insurance` (barang bernilai tinggi di atas ambang kurir). Adapter membaca flag itu dari response pricing hasil re-query dan mengisi `courier.use_insurance` sesuai — kalau tidak, Shipper menolak order.

:::caution[`createShipment()` adalah aksi nyata]

Memanggil `createShipment()` membuat order sungguhan ke Shipper dan menagih biaya pengiriman. Idempotent selama memakai `referenceId` yang sama (di-map ke `external_id`). Panggil hanya setelah user mengonfirmasi.

:::

## FAQ

**Apakah ini SDK resmi dari Shipper?** Tidak. Ini adapter unofficial untuk SDK open source `ongkir-sdk`, tidak berafiliasi dengan Shipper.

**Kenapa `getRates()`/`createShipment()` wajib `postalCode`?** API pricing Shipper butuh `area_id` level kelurahan yang di-resolve adapter dari postal code secara otomatis (dan di-cache per instance). Tanpa postal code, origin/destination tidak bisa di-resolve.

**`trackShipment()` pakai nomor resi atau order ID?** Order ID Shipper. Adapter memanggil `GET /v3/order/{id}` untuk detail + AWB + status.
