---
editUrl: false
next: false
prev: false
title: "MemoryCacheOptions"
---

Defined in: index.ts:19

## Properties

### now?

> `optional` **now?**: () => `number`

Defined in: index.ts:24

Supplier waktu (untuk testing). Default `Date.now`.

#### Returns

`number`

***

### provider

> **provider**: `ShippingProvider`

Defined in: index.ts:20

***

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: index.ts:22

Umur cache dalam ms. Default 5 menit. `0` mematikan caching.
