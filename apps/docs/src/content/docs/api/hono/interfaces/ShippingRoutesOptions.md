---
editUrl: false
next: false
prev: false
title: "ShippingRoutesOptions"
---

Defined in: middleware.ts:6

## Properties

### defaultProvider?

> `optional` **defaultProvider?**: `string`

Defined in: middleware.ts:10

Provider yang dipakai route /rates dan /track/:id. Wajib kalau mount > 1 provider.

***

### providers

> **providers**: `Record`\<`string`, `ShippingProvider`\>

Defined in: middleware.ts:8

Map nama provider (slug di URL, misal "biteship") → instance adapter.
