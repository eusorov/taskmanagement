import { describe, expect, it } from 'vitest'
import { limitName, MAX_NAME_LENGTH, stripName } from './taskName'

describe('stripName', () => {
  it('strips invisible characters from both ends, as the API does', () => {
    expect(stripName('  Buy milk  ')).toBe('Buy milk')
    expect(stripName(' Buy milk ')).toBe('Buy milk')
    expect(stripName('​﻿Buy milk　')).toBe('Buy milk')
    expect(stripName('\t\nBuy milk\r\n')).toBe('Buy milk')
    // U+E0001 LANGUAGE TAG, a format character outside the basic plane
    expect(stripName('\u{e0001}Buy milk\u{e0001}')).toBe('Buy milk')
  })

  it('keeps invisible characters inside', () => {
    expect(stripName('Buy milk\nand​bread')).toBe('Buy milk\nand​bread')
  })

  it('strips a name of only invisible characters to nothing', () => {
    expect(stripName(' ​ 　')).toBe('')
  })
})

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
