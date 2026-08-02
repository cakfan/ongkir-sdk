---
editUrl: false
next: false
prev: false
title: "ShipperProvider"
---

Defined in: provider-shipper/src/adapter.ts:41

## Implements

- `ShippingProvider`

## Constructors

### Constructor

> **new ShipperProvider**(`config`): `ShipperProvider`

Defined in: provider-shipper/src/adapter.ts:47

#### Parameters

##### config

[`ShipperProviderConfig`](/ongkir-sdk/api/shipper/interfaces/shipperproviderconfig/)

#### Returns

`ShipperProvider`

## Methods

### createShipment()

> **createShipment**(`params`): `Promise`\<`ShipmentResult`\>

Defined in: provider-shipper/src/adapter.ts:93

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

Defined in: provider-shipper/src/adapter.ts:53

#### Parameters

##### params

`RateRequest`

#### Returns

`Promise`\<`RateResult`[]\>

#### Implementation of

`ShippingProvider.getRates`

***

### parseWebhook()

> **parseWebhook**(`payload`, `_headers`): `WebhookEvent`

Defined in: provider-shipper/src/adapter.ts:128

#### Parameters

##### payload

`unknown`

##### \_headers

`Headers`

#### Returns

`WebhookEvent`

#### Implementation of

`ShippingProvider.parseWebhook`

***

### trackShipment()

> **trackShipment**(`trackingId`): `Promise`\<`TrackingResult`\>

Defined in: provider-shipper/src/adapter.ts:76

#### Parameters

##### trackingId

`string`

#### Returns

`Promise`\<`TrackingResult`\>

#### Implementation of

`ShippingProvider.trackShipment`
