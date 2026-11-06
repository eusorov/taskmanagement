import { PRIORITIES, type Priority } from '../api/client'
import type { paths } from '../api/schema'

export const PAGE_SIZE = 20

export type Status = 'all' | 'open' | 'done'

type ListQuery = NonNullable<paths['/api/tasks']['get']['parameters']['query']>

/** Orders offered in the UI, each mapped to the API's sort and order. Done tasks always come last. */
export const SORT_OPTIONS = {
  priority: { label: 'Priority', sort: undefined, order: undefined },
  newest: { label: 'Newest first', sort: 'createdAt', order: 'desc' },
  oldest: { label: 'Oldest first', sort: 'createdAt', order: 'asc' },
  updated: { label: 'Recently changed', sort: 'updatedAt', order: 'desc' },
  name: { label: 'Name A–Z', sort: 'name', order: 'asc' },
  'name-desc': { label: 'Name Z–A', sort: 'name', order: 'desc' },
} as const satisfies Record<string, { label: string; sort: ListQuery['sort']; order: ListQuery['order'] }>

export type SortOption = keyof typeof SORT_OPTIONS

/** List state kept in the URL, so a filtered view can be reloaded and shared. */
export interface TaskFilters {
  status: Status
  priorities: Priority[]
  query: string
  sort: SortOption
  page: number
}

export const DEFAULT_FILTERS: TaskFilters = { status: 'all', priorities: [], query: '', sort: 'priority', page: 0 }

/** Whether the list is narrowed down; sorting and paging don't count. */
export function isFiltered(filters: TaskFilters): boolean {
  return filters.status !== 'all' || filters.priorities.length > 0 || filters.query !== ''
}

/** Reads filters from the URL, ignoring anything invalid. */
export function parseFilters(params: URLSearchParams): TaskFilters {
  const status = params.get('status')
  const sort = params.get('sort')
  const page = Number(params.get('page'))
  return {
    status: status === 'open' || status === 'done' ? status : 'all',
    priorities: (params.get('priority') ?? '')
      .split(',')
      .filter((p): p is Priority => (PRIORITIES as string[]).includes(p)),
    query: params.get('q')?.trim() ?? '',
    sort: sort !== null && Object.hasOwn(SORT_OPTIONS, sort) ? (sort as SortOption) : 'priority',
    page: Number.isInteger(page) && page > 0 ? page : 0,
  }
}

/** Writes filters to the URL, leaving out defaults to keep it short. */
export function serializeFilters(filters: TaskFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.status !== 'all') params.set('status', filters.status)
  if (filters.priorities.length) params.set('priority', filters.priorities.join(','))
  if (filters.query) params.set('q', filters.query)
  if (filters.sort !== 'priority') params.set('sort', filters.sort)
  if (filters.page > 0) params.set('page', String(filters.page))
  return params
}

/** The query parameters of GET /api/tasks for these filters. */
export function toListQuery(filters: TaskFilters): ListQuery {
  const { sort, order } = SORT_OPTIONS[filters.sort]
  return {
    done: filters.status === 'all' ? undefined : filters.status === 'done',
    priority: filters.priorities.length ? filters.priorities : undefined,
    q: filters.query || undefined,
    sort,
    order,
    page: filters.page,
    size: PAGE_SIZE,
  }
}
