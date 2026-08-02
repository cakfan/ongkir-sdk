---
title: Resolusi wilayah
description: Resolve nama/kode wilayah standar ke RegionRef memakai RegionResolver dan api-wilayah-indonesia.
---

Provider berbeda memakai sistem ID wilayah yang berbeda (Biteship pakai area_id sendiri, Komerce pakai kode wilayah RajaOngkir, Shipper butuh area_id level kelurahan). Core package menyediakan `RegionResolver` untuk mencari `RegionRef` dari query provinsi/kota/kecamatan/kodepos.

Default memakai endpoint `https://wilayah.id/api` (instans `api-wilayah-indonesia`).

```ts
import { RegionResolver } from '@ongkir-sdk/core'

const resolver = new RegionResolver() // cache in-memory default, TTL 24 jam
const ref = await resolver.resolve({ postalCode: '12440' })
// { provinceCode: '31', cityCode: '3175', districtCode: '317502', postalCode: '12440' }
```

## Konfigurasi

| Opsi | Default | Deskripsi |
|---|---|---|
| `baseUrl` | `https://wilayah.id/api` | Endpoint `api-wilayah-indonesia` |
| `cache` | in-memory | Set `false` untuk matikan, atau objek `Map` custom |
| `ttlMs` | `86_400_000` (24 jam) | Masa cache |

Query yang tidak ditemukan melempar `RegionNotFoundError`. Field `postal_code`/`latitude`/`longitude` bisa `null` untuk sebagian desa (terutama Papua) — resolver fallback graceful, bukan throw.

## Deploy instance sendiri

`ongkir-sdk` butuh instance `api-wilayah-indonesia` untuk resolve data wilayah. Repositori: [github.com/cakfan/api-wilayah-indonesia](https://github.com/cakfan/api-wilayah-indonesia).

1. Fork/clone repo `api-wilayah-indonesia`
2. Install dependencies: `bun install`
3. Build data: `bun run build-data`
4. Deploy ke Vercel
5. Catat URL deployment (contoh: `https://wilayah-id.vercel.app`)
6. Set `REGION_API_BASE_URL` di `.env` ongkir-sdk ke URL tersebut

```ts
import { RegionResolver } from '@ongkir-sdk/core'

const resolver = new RegionResolver({
  baseUrl: process.env.REGION_API_BASE_URL ?? 'https://wilayah.id/api',
  cache: 'memory',
  ttlMs: 86_400_000, // 24 jam
})

const region = await resolver.resolve({ city: 'Bandung' })
```
