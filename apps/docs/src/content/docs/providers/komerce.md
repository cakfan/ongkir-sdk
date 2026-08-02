---
title: Komerce (RajaOngkir)
description: Adapter Komerce (RajaOngkir API V2) — rates dan tracking.
---

> **Unofficial SDK.** Not affiliated with, endorsed by, or officially connected to Komerce or RajaOngkir.

Adapter ini memakai **RajaOngkir API V2** (produk API pengiriman milik Komerce, base URL `https://rajaongkir.komerce.id/api/v1/`). API key di-generate dari dashboard Collaborator Komerce (menu Developer → Settings → Api Key).

## Instalasi

```bash
npm install @ongkir-sdk/komerce
```

## Penggunaan

```ts
import { KomerceProvider } from '@ongkir-sdk/komerce'

const provider = new KomerceProvider({ apiKey: process.env.RAJAONGKIR_API_KEY! })

// Cek ongkir
const rates = await provider.getRates({
  origin: { postalCode: '12440' },
  destination: { postalCode: '12240' },
  items: [{ weightGrams: 1000, value: 50000 }],
})

// Tracking — RajaOngkir mewajibkan kode kurir bersama nomor resi
const tracking = await provider.trackShipment('JNE001234567890', { courier: 'jne' })
```

## Konfigurasi

| Opsi | Tipe | Default | Deskripsi |
|---|---|---|---|
| `apiKey` | `string` | — | API key Shipping Cost RajaOngkir (wajib) |
| `baseUrl` | `string` | `https://rajaongkir.komerce.id/api/v1` | API base URL |
| `httpClient` | `function` | `fetch` | HTTP client custom untuk testing |

## Fitur yang didukung

- `getRates()` — via postal code. Adapter me-resolve postal code → location id RajaOngkir lewat endpoint pencarian destination, lalu menghitung biaya. Hasil lookup di-cache per instance.
- `trackShipment(trackingId, { courier })` — wajib menyertakan kode kurir (contoh `jne`, `sicepat`, `jnt`). Tanpa courier, adapter melempar error dengan pesan yang jelas.
- `parseWebhook()` — **tidak didukung**. Tier Shipping Cost (termasuk paket Starter gratis dan Pro) tidak menyediakan webhook; notifikasi status hanya ada di API Shipping Delivery (tier Enterprise). Memanggil `parseWebhook()` melempar error `WEBHOOK_NOT_SUPPORTED`.
- `createShipment()` — **tidak didukung** pada tier ini. Order pengiriman hanya ada di API Shipping Delivery (tier Enterprise) yang merupakan produk terpisah dengan base URL dan mekanisme auth (`x-api-key`) berbeda. Memanggil `createShipment()` melempar error `CREATE_SHIPMENT_NOT_SUPPORTED`.

## Keterbatasan yang perlu diketahui

- `getRates()` butuh **postal code** di `origin`/`destination`. `RegionRef` tanpa `postalCode` tidak bisa di-resolve ke id RajaOngkir (error `INVALID_ORIGIN`/`INVALID_DESTINATION`).
- Harga selalu dalam IDR (response domestic cost tidak menyediakan field mata uang).
- Tier Starter dibatasi 100 hit cek ongkir per hari; upgrade ke Pro untuk kuota lebih besar.
- Daftar kurir yang dicek mengikuti daftar 3PL yang tersedia di dokumentasi RajaOngkir (JNE, SiCepat, IDExpress, SAP, Ninja, J&T, TIKI, Wahana, POS, Sentral, Lion, REX).

## FAQ

**Apakah ini SDK resmi dari RajaOngkir atau Komerce?** Tidak. Ini adapter unofficial untuk SDK open source `ongkir-sdk`, tidak berafiliasi dengan Komerce maupun RajaOngkir.

**Kenapa `trackShipment` butuh courier?** API RajaOngkir mewajibkan kode kurir bersama nomor resi (misal `jne`). Tanpa courier, adapter melempar error dengan pesan yang jelas.
