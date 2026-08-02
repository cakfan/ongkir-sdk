---
title: Instalasi
description: Cara memasang ongkir-sdk di proyek TypeScript kamu.
---

Install `@ongkir-sdk/core` + satu adapter provider.

```bash
npm install @ongkir-sdk/core @ongkir-sdk/biteship
# atau
npm install @ongkir-sdk/core @ongkir-sdk/komerce
# atau
npm install @ongkir-sdk/core @ongkir-sdk/shipper
```

:::tip[Pakai Bun?]

```bash
bun add @ongkir-sdk/core @ongkir-sdk/biteship
```

:::

Package opsional:

```bash
npm install @ongkir-sdk/hono          # REST middleware (butuh hono + zod sebagai peer)
npm install @ongkir-sdk/cache-memory  # wrapper caching hasil getRates
```

## Runtime yang didukung

Node ≥18, Bun, Deno, dan Cloudflare Workers. Semua kode memakai Web-standard API (`fetch`, `crypto.subtle`) tanpa modul Node spesifik.

## API key

Tiap provider memakai API key milikmu sendiri (*bring-your-own-key*). SDK tidak menyimpan atau mem-proxy key ke server mana pun. Simpan key di environment variable, jangan di commit ke repo.

| Provider | Env var |
|---|---|
| Biteship | `BITESHIP_API_KEY` |
| Komerce (RajaOngkir) | `RAJAONGKIR_API_KEY` |
| Shipper | `SHIPPER_API_KEY` |
