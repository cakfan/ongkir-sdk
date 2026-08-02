---
editUrl: false
next: false
prev: false
title: "KomerceProvider"
---

Defined in: provider-komerce/src/adapter.ts:26

## Implements

- `ShippingProvider`

## Constructors

### Constructor

> **new KomerceProvider**(`config`): `KomerceProvider`

Defined in: provider-komerce/src/adapter.ts:32

#### Parameters

##### config

[`KomerceProviderConfig`](/ongkir-sdk/api/komerce/interfaces/komerceproviderconfig/)

#### Returns

`KomerceProvider`

## Methods

### createShipment()

> **createShipment**(`_params`): `Promise`\<`ShipmentResult`\>

Defined in: provider-komerce/src/adapter.ts:99

#### Parameters

##### \_params

`CreateShipmentRequest`

#### Returns

`Promise`\<`ShipmentResult`\>

#### Implementation of

`ShippingProvider.createShipment`

***

### getRates()

> **getRates**(`params`): `Promise`\<`RateResult`[]\>

Defined in: provider-komerce/src/adapter.ts:38

#### Parameters

##### params

`RateRequest`

#### Returns

`Promise`\<`RateResult`[]\>

#### Implementation of

`ShippingProvider.getRates`

***

### parseWebhook()

> **parseWebhook**(`_payload`, `_headers`): `WebhookEvent`

Defined in: provider-komerce/src/adapter.ts:90

#### Parameters

##### \_payload

`unknown`

##### \_headers

`Headers`

#### Returns

`WebhookEvent`

#### Implementation of

`ShippingProvider.parseWebhook`

***

### trackShipment()

> **trackShipment**(`trackingId`, `options?`): `Promise`\<`TrackingResult`\>

Defined in: provider-komerce/src/adapter.ts:61

#### Parameters

##### trackingId

`string`

##### options?

`TrackShipmentOptions`

#### Returns

`Promise`\<`TrackingResult`\>

#### Implementation of

`ShippingProvider.trackShipment`
