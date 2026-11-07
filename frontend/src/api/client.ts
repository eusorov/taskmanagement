import createClient from 'openapi-fetch'
import type { components, paths } from './schema'

export type Task = components['schemas']['TaskResponse']
export type Priority = Task['priority']
export type Problem = components['schemas']['Problem']

export const PRIORITIES: Priority[] = ['LOW', 'NORMAL', 'URGENT']

/** An error response from the API, with its RFC 7807 body when the server sent one. */
export class ApiError extends Error {
  readonly status: number
  readonly problem?: Problem

  constructor(status: number, problem?: Problem) {
    super(problem?.detail ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

export const api = createClient<paths>({
  // Same origin in dev (Vite proxy) and production (nginx)
  baseUrl: window.location.origin,
  // Look fetch up on each call, so tests can replace it
  fetch: (request) => globalThis.fetch(request),
})

/** Returns the response data, or throws an {@link ApiError} for any error status. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || !result.response.ok) {
    const problem = isProblem(result.error) ? result.error : undefined
    throw new ApiError(result.response.status, problem)
  }
  return result.data as T
}

function isProblem(value: unknown): value is Problem {
  return typeof value === 'object' && value !== null && 'status' in value && 'title' in value
}

/** A message for people, from whatever went wrong. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const violations = error.problem?.violations
    if (violations?.length) {
      return violations.map((v) => `${v.field}: ${v.message}`).join(', ')
    }
    if (error.status >= 500) {
      return 'The server ran into a problem. Try again in a moment.'
    }
    return error.message
  }
  return 'Could not reach the server. Check your connection and try again.'
}
