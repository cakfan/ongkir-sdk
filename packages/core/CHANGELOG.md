# @ongkir-sdk/core

## 1.0.1

### Patch Changes

- 383b753: docs: tambah README package core (halaman npm sebelumnya kosong)

## 1.0.0

### Major Changes

- a30df8d: Add `@ongkir-sdk/komerce` adapter (unofficial RajaOngkir API V2 by Komerce): getRates (postal-code based), trackShipment (requires courier code), webhook not supported in the target tier.

  Core contract additions (backward compatible):

  - `trackShipment(trackingId, options?: TrackShipmentOptions)` — new optional `courier` option for providers whose tracking API requires a courier code (RajaOngkir). Existing adapters ignore it.
  - New error code `WEBHOOK_NOT_SUPPORTED` for providers without webhook support in the targeted account tier.
  - Contract test suite: `ContractTestConfig.supportsWebhooks` flag (default true) to skip webhook tests for such providers.
