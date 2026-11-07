/** Longest task name, counted like the API counts it: in code points, so an emoji is one character. */
export const MAX_NAME_LENGTH = 500

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
