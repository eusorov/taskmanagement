import { describe, expect, it } from 'vitest'
import { limitName, MAX_NAME_LENGTH } from './taskName'

describe('limitName', () => {
  it('keeps names up to the limit', () => {
    expect(limitName('Buy milk')).toBe('Buy milk')
    expect(limitName('x'.repeat(MAX_NAME_LENGTH))).toBe('x'.repeat(MAX_NAME_LENGTH))
  })

  it('cuts longer names to the limit', () => {
    expect(limitName('x'.repeat(MAX_NAME_LENGTH + 1))).toBe('x'.repeat(MAX_NAME_LENGTH))
  })

  it('counts an emoji once, as the API does', () => {
    expect(limitName('😀'.repeat(MAX_NAME_LENGTH))).toBe('😀'.repeat(MAX_NAME_LENGTH))
    expect(limitName('😀'.repeat(MAX_NAME_LENGTH + 1))).toBe('😀'.repeat(MAX_NAME_LENGTH))
  })

  it('never splits an emoji in half', () => {
    expect(limitName('x' + '😀'.repeat(MAX_NAME_LENGTH))).toBe('x' + '😀'.repeat(MAX_NAME_LENGTH - 1))
  })
})
