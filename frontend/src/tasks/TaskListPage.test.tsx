import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { FakeApi } from '../test/fakeApi'
import { renderApp } from '../test/renderApp'

let api: FakeApi

beforeEach(() => {
  api = new FakeApi().install()
})

const taskList = () => screen.getByRole('list', { name: 'Tasks' })
const taskNames = () =>
  within(taskList())
    .getAllByRole('listitem')
    .map((item) => within(item).getAllByRole('paragraph')[0].textContent)

describe('task list', () => {
  it('shows tasks from the API with their priority', async () => {
    api.add('Pay rent', 'URGENT')
    api.add('Water plants', 'LOW')
    renderApp()

    expect(await screen.findByText('Pay rent')).toBeInTheDocument()
    expect(taskNames()).toEqual(['Pay rent', 'Water plants'])
    expect(within(taskList()).getByText('Urgent')).toBeInTheDocument()
    expect(within(taskList()).getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('2 tasks')).toBeInTheDocument()
  })

  it('invites to add the first task when there are none', async () => {
    renderApp()

    expect(await screen.findByText('No tasks yet. Add the first one above.')).toBeInTheDocument()
  })

  it('explains a failed load and retries', async () => {
    api.failNext('GET', 500)
    api.add('Pay rent')
    const { user } = renderApp()

    expect(await screen.findByText('The server ran into a problem. Try again in a moment.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Pay rent')).toBeInTheDocument()
  })
})

describe('adding a task', () => {
  it('creates the task with the chosen priority and clears the form', async () => {
    const { user } = renderApp()
    await screen.findByText(/No tasks yet/)

    await user.type(screen.getByRole('textbox', { name: 'Task name' }), '  Book dentist  ')
    await user.click(screen.getByRole('radio', { name: 'Urgent' }))
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Book dentist')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Task added')
    expect(api.lastRequest('POST')?.body).toEqual({ name: 'Book dentist', priority: 'URGENT', done: false })
    expect(screen.getByRole('textbox', { name: 'Task name' })).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked()
  })

  it('adds a task that is already done and resets the checkbox', async () => {
    const { user } = renderApp()
    await screen.findByText(/No tasks yet/)

    await user.type(screen.getByRole('textbox', { name: 'Task name' }), 'Paid the rent')
    await user.click(screen.getByRole('checkbox', { name: 'Already done' }))
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByRole('checkbox', { name: 'Done: Paid the rent' })).toBeChecked()
    expect(api.lastRequest('POST')?.body).toEqual({ name: 'Paid the rent', priority: 'NORMAL', done: true })
    expect(screen.getByRole('checkbox', { name: 'Already done' })).not.toBeChecked()
  })

  it('cannot add a blank task', async () => {
    const { user } = renderApp()
    await screen.findByText(/No tasks yet/)

    await user.type(screen.getByRole('textbox', { name: 'Task name' }), '   ')

    expect(screen.getByRole('button', { name: 'Add task' })).toBeDisabled()
  })

  it('shows why the server rejected the task', async () => {
    api.failNext('POST', 400, { detail: 'Invalid request', violations: [{ field: 'name', message: 'must not be blank' }] })
    const { user } = renderApp()
    await screen.findByText(/No tasks yet/)

    await user.type(screen.getByRole('textbox', { name: 'Task name' }), 'One more')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('name: must not be blank')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(screen.getByRole('textbox', { name: 'Task name' })).toHaveValue('One more')
  })
})

describe('changing a task', () => {
  it('marks a task done with the version it was loaded at', async () => {
    const task = api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('checkbox', { name: 'Done: Pay rent' }))

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeChecked())
    expect(screen.getByRole('status')).toHaveTextContent('Marked “Pay rent” as done')
    expect(api.lastRequest('PATCH')).toMatchObject({
      path: `/api/tasks/${task.id}`,
      body: { done: true, version: 0 },
    })
  })

  it('edits name and priority in a dialog', async () => {
    api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit task' })
    const name = within(dialog).getByRole('textbox', { name: 'Task name' })
    await user.clear(name)
    await user.type(name, 'Pay rent and bills')
    await user.click(within(dialog).getByRole('radio', { name: 'Urgent' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Pay rent and bills')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Changes saved')
    expect(api.lastRequest('PATCH')?.body).toEqual({ name: 'Pay rent and bills', priority: 'URGENT', version: 0 })
  })

  it('closes the edit dialog on Escape without saving', async () => {
    api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(api.lastRequest('PATCH')).toBeUndefined()
  })

  it('offers a reload when the task was changed elsewhere while editing', async () => {
    const task = api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    api.changeElsewhere(task, { name: 'Pay rent today' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Someone else changed this task while you were editing')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    await user.click(within(alert).getByRole('button', { name: 'Reload task' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Pay rent today')).toBeInTheDocument()
  })

  it('offers a reload when a done toggle hits a stale version', async () => {
    const task = api.add('Pay rent')
    const { user } = renderApp()

    await screen.findByText('Pay rent')
    api.changeElsewhere(task, { name: 'Pay rent today' })
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('changed or deleted elsewhere')
    await user.click(within(alert).getByRole('button', { name: 'Reload' }))
    expect(await screen.findByText('Pay rent today')).toBeInTheDocument()
  })

  it('confirms reopening a done task', async () => {
    api.add('Pay rent', 'NORMAL', true)
    const { user } = renderApp()

    await user.click(await screen.findByRole('checkbox', { name: 'Done: Pay rent' }))

    expect(await screen.findByText('Reopened “Pay rent”')).toBeInTheDocument()
  })

  it('deletes a task', async () => {
    api.add('Pay rent')
    api.add('Water plants')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Delete Pay rent' }))

    await waitFor(() => expect(screen.queryByText('Pay rent')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Deleted “Pay rent”')
    expect(taskNames()).toEqual(['Water plants'])
  })
})

describe('filters', () => {
  beforeEach(() => {
    api.add('Buy milk', 'URGENT')
    api.add('Buy bread', 'LOW', true)
    api.add('Call mom', 'NORMAL')
  })

  it('searches after typing pauses and keeps the search in the URL', async () => {
    const { user, router } = renderApp()
    await screen.findByText('Call mom')

    await user.type(screen.getByRole('searchbox', { name: 'Search tasks' }), 'buy')

    await waitFor(() => expect(taskNames()).toEqual(['Buy milk', 'Buy bread']))
    expect(router.state.location.search).toBe('?q=buy')
    expect(api.lastRequest('GET')?.query.get('q')).toBe('buy')
    expect(screen.getByText('2 tasks match')).toBeInTheDocument()
  })

  it('filters by status and priority', async () => {
    const { user, router } = renderApp()
    await screen.findByText('Call mom')

    await user.click(within(screen.getByRole('group', { name: 'Filter by status' })).getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(taskNames()).toEqual(['Buy milk', 'Call mom']))
    expect(api.lastRequest('GET')?.query.get('done')).toBe('false')

    await user.click(within(screen.getByRole('group', { name: 'Filter by priority' })).getByRole('button', { name: 'Urgent' }))
    await waitFor(() => expect(taskNames()).toEqual(['Buy milk']))
    expect(api.lastRequest('GET')?.query.getAll('priority')).toEqual(['URGENT'])
    expect(router.state.location.search).toBe('?status=open&priority=URGENT')
  })

  it('restores filters from the URL and clears them', async () => {
    const { user, router } = renderApp('/?status=done&q=milk')

    expect(await screen.findByText('No tasks match these filters.')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search tasks' })).toHaveValue('milk')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(taskNames()).toHaveLength(3))
    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('searchbox', { name: 'Search tasks' })).toHaveValue('')
  })
})

describe('sorting', () => {
  beforeEach(() => {
    api.add('Buy milk', 'URGENT')
    api.add('Water plants', 'LOW', true)
    api.add('Call mom', 'NORMAL')
    api.add('Answer emails', 'LOW')
  })

  const sortBy = () => screen.getByRole('combobox', { name: 'Sort by' })

  it('orders by priority by default, with done tasks last', async () => {
    renderApp()

    await screen.findByText('Call mom')
    expect(sortBy()).toHaveValue('priority')
    expect(taskNames()).toEqual(['Buy milk', 'Call mom', 'Answer emails', 'Water plants'])
    expect(api.lastRequest('GET')?.query.has('sort')).toBe(false)
  })

  it('sorts by the chosen order and keeps it in the URL', async () => {
    const { user, router } = renderApp()
    await screen.findByText('Call mom')

    await user.selectOptions(sortBy(), 'Name A–Z')

    await waitFor(() => expect(taskNames()).toEqual(['Answer emails', 'Buy milk', 'Call mom', 'Water plants']))
    expect(api.lastRequest('GET')?.query.get('sort')).toBe('name')
    expect(api.lastRequest('GET')?.query.get('order')).toBe('asc')
    expect(router.state.location.search).toBe('?sort=name')

    await user.selectOptions(sortBy(), 'Oldest first')

    await waitFor(() => expect(taskNames()).toEqual(['Buy milk', 'Call mom', 'Answer emails', 'Water plants']))
    expect(api.lastRequest('GET')?.query.get('sort')).toBe('createdAt')
    expect(api.lastRequest('GET')?.query.get('order')).toBe('asc')
  })

  it('restores the order from the URL and does not count it as a filter', async () => {
    renderApp('/?sort=name-desc')

    await screen.findByText('Call mom')
    expect(sortBy()).toHaveValue('name-desc')
    expect(taskNames()).toEqual(['Call mom', 'Buy milk', 'Answer emails', 'Water plants'])
    expect(screen.getByText('4 tasks')).toBeInTheDocument()
  })

  it('goes back to the first page when the order changes', async () => {
    const { user, router } = renderApp('/?page=1')
    await screen.findByText('No tasks yet. Add the first one above.')

    await user.selectOptions(sortBy(), 'Newest first')

    await waitFor(() => expect(router.state.location.search).toBe('?sort=newest'))
  })

  it('keeps the order when filters are cleared', async () => {
    const { user, router } = renderApp('/?q=nothing&sort=name')

    await user.click(await screen.findByRole('button', { name: 'Clear filters' }))

    await waitFor(() => expect(router.state.location.search).toBe('?sort=name'))
    expect(sortBy()).toHaveValue('name')
  })
})

describe('pagination', () => {
  it('pages through tasks 20 at a time', async () => {
    for (let i = 1; i <= 45; i++) api.add(`Task ${i}`)
    const { user, router } = renderApp()

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(taskNames()).toHaveLength(20)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(await screen.findByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Page 3 of 3')).toBeInTheDocument()
    // Newest first, so the last page holds the oldest tasks
    await waitFor(() => expect(taskNames()).toEqual(['Task 5', 'Task 4', 'Task 3', 'Task 2', 'Task 1']))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(router.state.location.search).toBe('?page=2')
  })

  it('hides pagination when everything fits on one page', async () => {
    api.add('Only task')
    renderApp()

    await screen.findByText('Only task')
    expect(screen.queryByRole('navigation', { name: 'Pages' })).not.toBeInTheDocument()
  })
})

describe('routing', () => {
  it('shows a not-found page for unknown paths', async () => {
    renderApp('/nope')

    expect(screen.getByRole('heading', { name: 'This page doesn’t exist' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to your tasks' })).toHaveAttribute('href', '/')
  })
})
