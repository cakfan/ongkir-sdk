---
editUrl: false
next: false
prev: false
title: "MemoryCacheProvider"
---

Defined in: index.ts:28

Membungkus ShippingProvider dan meng-cache hasil getRates di memori.

## Implements

- `ShippingProvider`

## Constructors

### Constructor

> **new MemoryCacheProvider**(`options`): `MemoryCacheProvider`

Defined in: index.ts:35

#### Parameters

##### options

[`MemoryCacheOptions`](/ongkir-sdk/api/cache-memory/interfaces/memorycacheoptions/)

#### Returns

`MemoryCacheProvider`

## Methods

### clear()

> **clear**(): `void`

Defined in: index.ts:72

Menghapus seluruh isi cache dan membatalkan timer eviction yang tertunda.

#### Returns

`void`

***

### createShipment()

> **createShipment**(`params`): `Promise`\<`ShipmentResult`\>

Defined in: index.ts:67

#### Parameters

##### params

`CreateShipmentRequest`

#### Returns

`Promise`\<`ShipmentResult`\>

#### Implementation of

`ShippingProvider.createShipment`

***

### getRates()

> **getRates**(`params`): `Promise`\<`RateResult`[]\>

Defined in: index.ts:41

#### Parameters

##### params

`RateRequest`

#### Returns

`Promise`\<`RateResult`[]\>

#### Implementation of

`ShippingProvider.getRates`

***

### parseWebhook()

> **parseWebhook**(`payload`, `headers`): `WebhookEvent`

Defined in: index.ts:63

#### Parameters

##### payload

`unknown`

##### headers

`Headers`

#### Returns

`WebhookEvent`

#### Implementation of

`ShippingProvider.parseWebhook`

***

### trackShipment()

> **trackShipment**(`trackingId`, `options?`): `Promise`\<`TrackingResult`\>

Defined in: index.ts:59

#### Parameters

##### trackingId

`string`

##### options?

`TrackShipmentOptions`

#### Returns

`Promise`\<`TrackingResult`\>

#### Implementation of

`ShippingProvider.trackShipment`
