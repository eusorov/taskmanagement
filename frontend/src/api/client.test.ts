import { describe, expect, it } from 'vitest'
import { ApiError, errorMessage, unwrap } from './client'

const response = (status: number) => new Response(null, { status })

describe('unwrap', () => {
  it('returns data of a successful response', () => {
    expect(unwrap({ data: { ok: true }, response: response(200) })).toEqual({ ok: true })
  })

  it('throws ApiError with the problem body', () => {
    const problem = { type: 'about:blank', title: 'Conflict', status: 409, detail: 'Task was changed' }
    expect(() => unwrap({ error: problem, response: response(409) })).toThrow(
      expect.objectContaining({ status: 409, problem, message: 'Task was changed' }),
    )
  })

  it('throws ApiError even without a problem body', () => {
    expect(() => unwrap({ error: 'oops', response: response(502) })).toThrow(ApiError)
  })
})

describe('errorMessage', () => {
  it('lists validation violations', () => {
    const error = new ApiError(400, {
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      violations: [{ field: 'name', message: 'must not be blank' }],
    })
    expect(errorMessage(error)).toBe('name: must not be blank')
  })

  it('uses the problem detail for client errors', () => {
    expect(errorMessage(new ApiError(404, { type: 'about:blank', title: 'Not Found', status: 404, detail: 'Task 42 not found' }))).toBe(
      'Task 42 not found',
    )
  })

  it('hides server error details', () => {
    expect(errorMessage(new ApiError(500))).toBe('The server ran into a problem. Try again in a moment.')
  })

  it('explains network failures', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/Could not reach the server/)
  })
})
