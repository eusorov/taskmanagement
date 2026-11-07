import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  isFiltered,
  limitQuery,
  MAX_QUERY_LENGTH,
  PAGE_SIZE,
  parseFilters,
  serializeFilters,
  toListQuery,
} from './filters'

describe('limitQuery', () => {
  it('keeps search texts up to the limit', () => {
    expect(limitQuery('milk')).toBe('milk')
    expect(limitQuery('x'.repeat(MAX_QUERY_LENGTH))).toBe('x'.repeat(MAX_QUERY_LENGTH))
  })

  it('cuts longer ones to the limit', () => {
    expect(limitQuery('x'.repeat(MAX_QUERY_LENGTH + 1))).toBe('x'.repeat(MAX_QUERY_LENGTH))
  })

  it('never cuts an emoji in half', () => {
    // The emoji would take units 500 and 501
    expect(limitQuery('x'.repeat(MAX_QUERY_LENGTH - 1) + '😀')).toBe('x'.repeat(MAX_QUERY_LENGTH - 1))
    expect(limitQuery('x'.repeat(MAX_QUERY_LENGTH - 2) + '😀😀')).toBe('x'.repeat(MAX_QUERY_LENGTH - 2) + '😀')
  })
})

describe('parseFilters', () => {
  it('uses defaults for an empty URL', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })

  it('reads every filter', () => {
    expect(parseFilters(new URLSearchParams('status=done&priority=URGENT,LOW&q=milk&sort=name-desc&page=2'))).toEqual({
      status: 'done',
      priorities: ['URGENT', 'LOW'],
      query: 'milk',
      sort: 'name-desc',
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
    expect(parseFilters(new URLSearchParams('sort=owner')).sort).toBe('priority')
    expect(parseFilters(new URLSearchParams('sort=toString')).sort).toBe('priority')
  })

  it('cuts a search from the URL that the API would reject as too long', () => {
    const q = 'x'.repeat(MAX_QUERY_LENGTH + 10)
    expect(parseFilters(new URLSearchParams({ q })).query).toBe('x'.repeat(MAX_QUERY_LENGTH))
  })
})

describe('serializeFilters', () => {
  it('leaves out defaults', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('')
  })

  it('round-trips through parseFilters', () => {
    const filters = { status: 'open', priorities: ['NORMAL', 'URGENT'], query: 'call mom', sort: 'updated', page: 3 } as const
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
      sort: undefined,
      order: undefined,
      page: 0,
      size: PAGE_SIZE,
    })
  })

  it('maps each sort option to the API sort and order', () => {
    const query = (sort: (typeof DEFAULT_FILTERS)['sort']) => {
      const { sort: field, order } = toListQuery({ ...DEFAULT_FILTERS, sort })
      return [field, order]
    }
    expect(query('newest')).toEqual(['createdAt', 'desc'])
    expect(query('oldest')).toEqual(['createdAt', 'asc'])
    expect(query('updated')).toEqual(['updatedAt', 'desc'])
    expect(query('name')).toEqual(['name', 'asc'])
    expect(query('name-desc')).toEqual(['name', 'desc'])
  })

  it('maps status to done', () => {
    expect(toListQuery({ ...DEFAULT_FILTERS, status: 'open' }).done).toBe(false)
    expect(toListQuery({ ...DEFAULT_FILTERS, status: 'done' }).done).toBe(true)
  })
})

describe('isFiltered', () => {
  it('counts status, priority and search but not sorting or paging', () => {
    expect(isFiltered({ ...DEFAULT_FILTERS, sort: 'name', page: 2 })).toBe(false)
    expect(isFiltered({ ...DEFAULT_FILTERS, status: 'done' })).toBe(true)
    expect(isFiltered({ ...DEFAULT_FILTERS, priorities: ['LOW'] })).toBe(true)
    expect(isFiltered({ ...DEFAULT_FILTERS, query: 'milk' })).toBe(true)
  })
})
