/** Longest task name, counted like the API counts it: in code points, so an emoji is one character. */
export const MAX_NAME_LENGTH = 500

/**
 * One character that doesn't show, the same set as the API's TaskNames: Unicode whitespace, format characters such
 * as the zero-width space U+200B, and control characters.
 */
const INVISIBLE = /^[\p{White_Space}\p{Cf}\p{Cc}]$/u

/**
 * Removes invisible characters from both ends, as the API does before it validates; an empty result is a blank name.
 * Used instead of String.trim, which keeps the zero-width space.
 */
export function stripName(name: string): string {
  const chars = Array.from(name)
  let start = 0
  while (start < chars.length && INVISIBLE.test(chars[start])) start++
  let end = chars.length
  while (end > start && INVISIBLE.test(chars[end - 1])) end--
  return chars.slice(start, end).join('')
}

/**
 * Cuts a name to MAX_NAME_LENGTH code points. Used instead of the input's maxLength, which counts UTF-16 units
 * and so stops at 250 emoji.
 */
export function limitName(name: string): string {
  // A string never has more code points than UTF-16 units, so short ones need no counting
  if (name.length <= MAX_NAME_LENGTH) return name
  const chars = Array.from(name)
  return chars.length <= MAX_NAME_LENGTH ? name : chars.slice(0, MAX_NAME_LENGTH).join('')
}
