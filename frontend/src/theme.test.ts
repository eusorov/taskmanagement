// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The colours of the @theme block in index.css, by name. Read from disk: Vitest imports CSS as an empty string
const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
const color = (name: string): string => {
  const hex = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]
  if (!hex) throw new Error(`--color-${name} not found in index.css`)
  return hex
}
const WHITE = '#ffffff'

/** WCAG 2 contrast ratio of two colours. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

describe('theme contrast (WCAG AA)', () => {
  it.each(['ink', 'muted', 'blue-pencil', 'red-pencil'])('%s text is readable on paper and white', (name) => {
    expect(contrast(color(name), color('paper'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(color(name), WHITE)).toBeGreaterThanOrEqual(4.5)
  })

  it('form controls have an edge that can be seen on paper and white', () => {
    expect(contrast(color('edge'), color('paper'))).toBeGreaterThanOrEqual(3)
    expect(contrast(color('edge'), WHITE)).toBeGreaterThanOrEqual(3)
  })
})
