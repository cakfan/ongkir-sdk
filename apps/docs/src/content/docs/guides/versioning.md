---
title: Versioning & rilis
description: Cara kerja SemVer, dist-tag (latest, alpha, beta, rc), dan cara install build pre-release tiap package.
---

Semua package mengikuti **SemVer** (`MAJOR.MINOR.PATCH`) dengan versioning independen per package:

- **MAJOR** — breaking change. Untuk `@ongkir-sdk/core`, perubahan contract/tipe publik selalu major.
- **MINOR** — fitur baru yang backward-compatible.
- **PATCH** — bugfix.

Karena versioning independen, versi `@ongkir-sdk/biteship` tidak ikut naik ketika `@ongkir-sdk/core` rilis versi baru — dan sebaliknya. Adapter ber-dependency ke `core` dengan range yang aman.

## Dist-tag npm

Package di-publish ke beberapa **dist-tag**:

| Dist-tag | Arti |
|---|---|
| `latest` | Rilis stabil, aman untuk production. Ini yang didapat saat install tanpa tag. |
| `alpha` | Build pre-release paling awal: fitur belum lengkap, API masih berubah. |
| `beta` | Feature-complete, API hampir final, masih ada bug. |
| `rc` | Release candidate: API dibekukan, hanya perbaikan bug. |

Urutan SemVer: `alpha < beta < rc < stabil`. Contoh versi nyata: `2.1.0-alpha.0`, `2.1.0-beta.2`, `2.1.0-rc.1`, lalu `2.1.0`.

## Kenapa `npm install` biasa tidak dapat versi pre-release?

Versi pre-release punya suffix (mis. `-beta.0`) dan **tidak pernah ke-match** range `^` atau `~`. Kalau kamu punya `"@ongkir-sdk/core": "^2.0.0"`, npm tidak akan meng-upgrade ke `2.1.0-beta.0` secara otomatis — kamu harus minta eksplisit. Ini disengaja supaya build yang belum stabil tidak nyasar ke aplikasi production.

## Cara install build pre-release

Pasang paket spesifik dengan tag-nya:

```bash
npm install @ongkir-sdk/core@rc @ongkir-sdk/biteship@rc
npm install @ongkir-sdk/core@beta @ongkir-sdk/komerce@beta
npm install @ongkir-sdk/core@alpha @ongkir-sdk/shipper@alpha
```

Atau pin versi persis:

```bash
npm install @ongkir-sdk/core@2.1.0-beta.2
```

Untuk meminjam channel pre-release secara permanen di `package.json`, tulis tag sebagai range:

```json
{
  "dependencies": {
    "@ongkir-sdk/core": "beta"
  }
}
```

> `@alpha`/`@beta`/`@rc` di `npm install` merujuk ke dist-tag, sedangkan di `package.json` sebagai dependency bisa ditulis sebagai range tag (`"@ongkir-sdk/core": "beta"`). Keduanya valid, tapi jangan pakai versi pre-release di production kecuali kamu siap menerima perubahan breaking antar rilis pre.

## Cek versi & dist-tag yang tersedia

```bash
npm view @ongkir-sdk/core dist-tags
npm view @ongkir-sdk/core versions
```

Pastikan `latest` selalu menunjuk rilis stabil — jangan pasang pre-release tanpa sadar sebagai `latest` di lockfile.

## Changelog

Riwayat perubahan tiap package tercatat di `CHANGELOG.md` masing-masing dan di halaman API reference docsite. Kategori perubahan (`Major`/`Minor`/`Patch`) konsisten dengan aturan SemVer di atas.
