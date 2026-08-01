# @ongkir-sdk/cache-memory

> Paket **tidak resmi** — tidak berafiliasi dengan atau didukung secara resmi oleh Biteship, Komerce, RajaOngkir, Shipper, atau penyedia logistik mana pun.

Wrapper caching in-memory untuk `ShippingProvider` apa pun di `@ongkir-sdk/core`. Berguna kalau kamu memanggil `getRates()` berulang kali untuk request yang sama (mis. saat user mengetik kota tujuan di form checkout) dan tidak mau membebani API provider — terutama provider yang menghitung biaya secara real-time.

## Instalasi

```bash
bun add @ongkir-sdk/cache-memory
```

## Penggunaan

```ts
import { MemoryCacheProvider } from '@ongkir-sdk/cache-memory'
import { ShipperProvider } from '@ongkir-sdk/shipper'

const shipper = new ShipperProvider({ apiKey: 'YOUR_API_KEY' })
const provider = new MemoryCacheProvider({ provider: shipper })

const rates = await provider.getRates({
  origin: { postalCode: '10110' },
  destination: { postalCode: '40111' },
  items: [{ weightGrams: 1000, quantity: 1 }],
})
```

## Yang di-cache

Hanya `getRates()` yang di-cache. `trackShipment()`, `createShipment()`, dan `parseWebhook()` selalu diteruskan langsung ke provider — hasilnya tidak pernah di-cache.

Kunci cache dibuat dari request ternormalisasi (origin, destination, dan items). Request yang sama akan memakai entri yang sama.

## Konfigurasi

| Opsi | Default | Deskripsi |
| --- | --- | --- |
| `provider` | — | Instance `ShippingProvider` yang dibungkus. Wajib. |
| `ttlMs` | `300_000` (5 menit) | Umur cache dalam ms. Set `0` untuk mematikan caching. |
| `now` | `Date.now` | Supplier waktu, untuk testing. |

## API

- `getRates(params)` — hasil di-cache selama TTL; hasil yang dikembalikan adalah salinan, jadi mutasi oleh caller tidak mencemari cache. Entri di-evict otomatis dari memori setelah TTL lewat.
- `trackShipment(id, options?)` — delegasi langsung.
- `parseWebhook(payload, headers)` — delegasi langsung.
- `createShipment(params)` — delegasi langsung.
- `clear()` — kosongkan seluruh cache secara manual.

## FAQ

**Apa yang di-cache?**
Hanya hasil `getRates()`. `trackShipment()`, `createShipment()`, dan `parseWebhook()` selalu diteruskan langsung ke provider.

**Berapa lama hasil cache disimpan?**
TTL default 5 menit (`ttlMs`); set `0` untuk mematikan caching. Entri di-evict otomatis setelah TTL lewat.

**Runtime apa yang didukung?**
Node ≥18, Bun, Deno, dan Cloudflare Workers — murni Web-standard API, tanpa dependency eksternal.

## Tests

```bash
bun run test
```
