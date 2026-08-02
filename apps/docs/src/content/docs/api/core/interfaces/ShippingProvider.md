---
editUrl: false
next: false
prev: false
title: "ShippingProvider"
---

Defined in: contract.ts:11

## Methods

### createShipment()

> **createShipment**(`params`): `Promise`\<[`ShipmentResult`](/ongkir-sdk/api/core/interfaces/shipmentresult/)\>

Defined in: contract.ts:15

#### Parameters

##### params

[`CreateShipmentRequest`](/ongkir-sdk/api/core/interfaces/createshipmentrequest/)

#### Returns

`Promise`\<[`ShipmentResult`](/ongkir-sdk/api/core/interfaces/shipmentresult/)\>

***

### getRates()

> **getRates**(`params`): `Promise`\<[`RateResult`](/ongkir-sdk/api/core/interfaces/rateresult/)[]\>

Defined in: contract.ts:12

#### Parameters

##### params

[`RateRequest`](/ongkir-sdk/api/core/interfaces/raterequest/)

#### Returns

`Promise`\<[`RateResult`](/ongkir-sdk/api/core/interfaces/rateresult/)[]\>

***

### parseWebhook()

> **parseWebhook**(`payload`, `headers`): [`WebhookEvent`](/ongkir-sdk/api/core/interfaces/webhookevent/)

Defined in: contract.ts:14

#### Parameters

##### payload

`unknown`

##### headers

`Headers`

#### Returns

[`WebhookEvent`](/ongkir-sdk/api/core/interfaces/webhookevent/)

***

### trackShipment()

> **trackShipment**(`trackingId`, `options?`): `Promise`\<[`TrackingResult`](/ongkir-sdk/api/core/interfaces/trackingresult/)\>

Defined in: contract.ts:13

#### Parameters

##### trackingId

`string`

##### options?

[`TrackShipmentOptions`](/ongkir-sdk/api/core/interfaces/trackshipmentoptions/)

#### Returns

`Promise`\<[`TrackingResult`](/ongkir-sdk/api/core/interfaces/trackingresult/)\>
