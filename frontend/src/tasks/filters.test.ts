import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, PAGE_SIZE, parseFilters, serializeFilters, toListQuery } from './filters'

describe('parseFilters', () => {
  it('uses defaults for an empty URL', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })

  it('reads every filter', () => {
    expect(parseFilters(new URLSearchParams('status=done&priority=URGENT,LOW&q=milk&page=2'))).toEqual({
      status: 'done',
      priorities: ['URGENT', 'LOW'],
      query: 'milk',
      page: 2,
    })
  })

  it('ignores invalid values', () => {
    expect(parseFilters(new URLSearchParams('status=maybe&priority=HIGH,LOW&page=-1'))).toEqual({
      ...DEFAULT_FILTERS,
      priorities: ['LOW'],
    })
    expect(parseFilters(new URLSearchParams('page=1.5')).page).toBe(0)
    expect(parseFilters(new URLSearchParams('page=abc')).page).toBe(0)
  })
})

describe('serializeFilters', () => {
  it('leaves out defaults', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('round-trips through parseFilters', () => {
    const filters = { status: 'open', priorities: ['NORMAL', 'URGENT'], query: 'call mom', page: 3 } as const
    const copy = { ...filters, priorities: [...filters.priorities] }
    expect(parseFilters(serializeFilters(copy))).toEqual(copy)
  })
})

describe('toListQuery', () => {
  it('sends only what is filtered', () => {
    expect(toListQuery(DEFAULT_FILTERS)).toEqual({
      done: undefined,
      priority: undefined,
      q: undefined,
      page: 0,
      size: PAGE_SIZE,
    })
  })

  it('maps status to done', () => {
    expect(toListQuery({ ...DEFAULT_FILTERS, status: 'open' }).done).toBe(false)
    expect(toListQuery({ ...DEFAULT_FILTERS, status: 'done' }).done).toBe(true)
  })
})
