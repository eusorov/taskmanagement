import { vi } from 'vitest'
import type { Priority, Problem, Task } from '../api/client'

export interface RecordedRequest {
  method: string
  path: string
  query: URLSearchParams
  body?: unknown
}

/**
 * An in-memory stand-in for the backend's /api/tasks, installed as global fetch. Mirrors the real API closely
 * enough for UI tests: filtering, paging, versions and RFC 7807 errors.
 */
export class FakeApi {
  tasks: Task[] = []
  requests: RecordedRequest[] = []
  /** Status to answer the next matching request with, instead of handling it. */
  private failures: { method: string; status: number; problem?: Partial<Problem> }[] = []
  private clock = Date.parse('2026-01-01T10:00:00Z')

  install() {
    vi.stubGlobal('fetch', vi.fn((request: Request) => this.handle(request)))
    return this
  }

  add(name: string, priority: Priority = 'NORMAL', done = false): Task {
    const now = new Date((this.clock += 60_000)).toISOString()
    const task: Task = { id: crypto.randomUUID(), name, priority, done, createdAt: now, updatedAt: now, version: 0 }
    this.tasks.push(task)
    return task
  }

  failNext(method: string, status: number, problem?: Partial<Problem>) {
    this.failures.push({ method, status, problem })
  }

  /** Simulates another user changing a task, so the version the UI holds goes stale. */
  changeElsewhere(task: Task, changes: Partial<Task>) {
    Object.assign(this.find(task.id)!, changes, { version: this.find(task.id)!.version + 1 })
  }

  lastRequest(method: string) {
    return this.requests.filter((r) => r.method === method).at(-1)
  }

  private find(id: string) {
    return this.tasks.find((t) => t.id === id)
  }

  private async handle(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const body = request.method === 'GET' || request.method === 'DELETE' ? undefined : await request.json()
    this.requests.push({ method: request.method, path: url.pathname, query: url.searchParams, body })

    const failure = this.failures.findIndex((f) => f.method === request.method)
    if (failure >= 0) {
      const [{ status, problem }] = this.failures.splice(failure, 1)
      return problemResponse(status, problem)
    }

    const id = url.pathname.match(/^\/api\/tasks\/(.+)$/)?.[1]
    if (url.pathname === '/api/tasks' && request.method === 'GET') return this.list(url.searchParams)
    if (url.pathname === '/api/tasks' && request.method === 'POST') return this.create(body as Pick<Task, 'name' | 'priority'>)
    if (id && request.method === 'PATCH') return this.update(id, body as Partial<Task> & { version: number })
    if (id && request.method === 'DELETE') return this.remove(id)
    return problemResponse(404)
  }

  private list(query: URLSearchParams) {
    const done = query.get('done')
    const priorities = query.getAll('priority')
    const q = query.get('q')?.toLowerCase()
    const page = Number(query.get('page') ?? 0)
    const size = Number(query.get('size') ?? 50)
    const matching = this.tasks
      .filter((t) => done === null || String(t.done) === done)
      .filter((t) => priorities.length === 0 || priorities.includes(t.priority))
      .filter((t) => !q || t.name.toLowerCase().includes(q))
    return json(200, { items: matching.slice(page * size, (page + 1) * size), page, size, total: matching.length })
  }

  private create({ name, priority }: Pick<Task, 'name' | 'priority'>) {
    return json(201, this.add(name, priority ?? 'NORMAL'))
  }

  private update(id: string, { version, ...changes }: Partial<Task> & { version: number }) {
    const task = this.find(id)
    if (!task) return problemResponse(404)
    if (task.version !== version) return problemResponse(409, { detail: `Task ${id} was changed by someone else` })
    Object.assign(task, changes, { version: task.version + 1 })
    return json(200, task)
  }

  private remove(id: string) {
    const index = this.tasks.findIndex((t) => t.id === id)
    if (index < 0) return problemResponse(404)
    this.tasks.splice(index, 1)
    return new Response(null, { status: 204 })
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function problemResponse(status: number, problem: Partial<Problem> = {}) {
  const body = { type: 'about:blank', title: `Status ${status}`, status, ...problem }
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/problem+json' } })
}
