---
editUrl: false
next: false
prev: false
title: "ShippingSDKError"
---

Defined in: errors.ts:18

## Extends

- `Error`

## Constructors

### Constructor

> **new ShippingSDKError**(`opts`): `ShippingSDKError`

Defined in: errors.ts:25

#### Parameters

##### opts

###### cause?

`unknown`

###### code

`"INVALID_ORIGIN"` \| `"INVALID_DESTINATION"` \| `"RATE_NOT_AVAILABLE"` \| `"TRACKING_NOT_FOUND"` \| `"PROVIDER_AUTH_FAILED"` \| `"PROVIDER_RATE_LIMITED"` \| `"PROVIDER_UNAVAILABLE"` \| `"WEBHOOK_SIGNATURE_INVALID"` \| `"WEBHOOK_NOT_SUPPORTED"` \| `"CREATE_SHIPMENT_NOT_SUPPORTED"` \| `"CREATE_SHIPMENT_FAILED"` \| `"UNKNOWN"`

###### message

`string`

###### provider

`string`

###### providerErrorCode?

`string`

###### retryable?

`boolean`

#### Returns

`ShippingSDKError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `readonly` `optional` **cause?**: `unknown`

Defined in: errors.ts:23

#### Overrides

`Error.cause`

***

### code

> `readonly` **code**: `"INVALID_ORIGIN"` \| `"INVALID_DESTINATION"` \| `"RATE_NOT_AVAILABLE"` \| `"TRACKING_NOT_FOUND"` \| `"PROVIDER_AUTH_FAILED"` \| `"PROVIDER_RATE_LIMITED"` \| `"PROVIDER_UNAVAILABLE"` \| `"WEBHOOK_SIGNATURE_INVALID"` \| `"WEBHOOK_NOT_SUPPORTED"` \| `"CREATE_SHIPMENT_NOT_SUPPORTED"` \| `"CREATE_SHIPMENT_FAILED"` \| `"UNKNOWN"`

Defined in: errors.ts:19

***

### provider

> `readonly` **provider**: `string`

Defined in: errors.ts:20

***

### providerErrorCode?

> `readonly` `optional` **providerErrorCode?**: `string`

Defined in: errors.ts:21

***

### retryable

> `readonly` **retryable**: `boolean`

Defined in: errors.ts:22
