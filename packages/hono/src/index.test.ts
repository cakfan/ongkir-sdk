import { describe, expect, it } from 'bun:test'

describe('@ongkir-sdk/hono', () => {
  it('should be importable', async () => {
    const mod = await import('./index')
    expect(mod).toBeDefined()
  })
})
