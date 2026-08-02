---
editUrl: false
next: false
prev: false
title: "CreateShipmentRequest"
---

Defined in: types.ts:92

## Properties

### cashOnDelivery?

> `optional` **cashOnDelivery?**: `object`

Defined in: types.ts:103

#### amount

> **amount**: `number`

***

### courier

> **courier**: `string`

Defined in: types.ts:97

Kode kurir — cocokkan dengan `RateResult.provider`.

***

### destination

> **destination**: [`ShipmentContact`](/ongkir-sdk/api/core/interfaces/shipmentcontact/)

Defined in: types.ts:94

***

### items

> **items**: [`ShipmentItem`](/ongkir-sdk/api/core/interfaces/shipmentitem/)[]

Defined in: types.ts:95

***

### note?

> `optional` **note?**: `string`

Defined in: types.ts:102

***

### origin

> **origin**: [`ShipmentContact`](/ongkir-sdk/api/core/interfaces/shipmentcontact/)

Defined in: types.ts:93

***

### referenceId?

> `optional` **referenceId?**: `string`

Defined in: types.ts:101

ID idempotency dari sistem consumer (mis. nomor invoice).

***

### service

> **service**: `string`

Defined in: types.ts:99

Tipe layanan — cocokkan dengan `RateResult.service`.
