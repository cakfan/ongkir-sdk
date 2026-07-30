# Deploy api-wilayah-indonesia

`ongkir-sdk` membutuhkan instance `api-wilayah-indonesia` untuk resolve data wilayah (provinsi/kabupaten/kecamatan/desa + kode pos).

Repositori: [github.com/cakfan/api-wilayah-indonesia](https://github.com/cakfan/api-wilayah-indonesia)

## Deploy ke Vercel

1. Fork/clone repo `api-wilayah-indonesia`
2. Install dependencies: `bun install`
3. Build data: `bun run build-data`
4. Deploy ke Vercel
5. Catat URL deployment (contoh: `https://wilayah-id.vercel.app`)
6. Set `REGION_API_BASE_URL` di `.env` ongkir-sdk ke URL tersebut

## Konfigurasi di ongkir-sdk

```ts
import { RegionResolver } from '@ongkir-sdk/core'

const resolver = new RegionResolver({
  baseUrl: process.env.REGION_API_BASE_URL ?? 'https://wilayah.id/api',
  cache: 'memory',
  ttlMs: 86_400_000, // 24 jam
})

const region = await resolver.resolve({ city: 'Bandung' })
```
