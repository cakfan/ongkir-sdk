---
editUrl: false
next: false
prev: false
title: "BiteshipProvider"
---

Defined in: adapter.ts:34

## Implements

- `ShippingProvider`

## Constructors

### Constructor

> **new BiteshipProvider**(`config`): `BiteshipProvider`

Defined in: adapter.ts:39

#### Parameters

##### config

[`BiteshipProviderConfig`](/ongkir-sdk/api/biteship/interfaces/biteshipproviderconfig/)

#### Returns

`BiteshipProvider`

## Methods

### createShipment()

> **createShipment**(`params`): `Promise`\<`ShipmentResult`\>

Defined in: adapter.ts:82

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

Defined in: adapter.ts:45

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

Defined in: adapter.ts:102

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

> **trackShipment**(`trackingId`): `Promise`\<`TrackingResult`\>

Defined in: adapter.ts:65

#### Parameters

##### trackingId

`string`

#### Returns

`Promise`\<`TrackingResult`\>

#### Implementation of

`ShippingProvider.trackShipment`
