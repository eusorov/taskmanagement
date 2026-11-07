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
/** The list item of the task with this name. */
const row = (name: string) => screen.getByRole('checkbox', { name: `Done: ${name}` }).closest('li')!

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

  it('counts invisible characters as blank, as the API does', async () => {
    const { user } = renderApp()
    await screen.findByText(/No tasks yet/)

    // A zero-width space, which String.trim keeps but the API counts as blank
    await user.type(screen.getByRole('textbox', { name: 'Task name' }), ' ​ ')

    expect(screen.getByRole('button', { name: 'Add task' })).toBeDisabled()
  })

  it('sends the name without invisible characters at its ends', async () => {
    const { user } = renderApp()
    await screen.findByText(/No tasks yet/)

    await user.type(screen.getByRole('textbox', { name: 'Task name' }), '​Book dentist​')
    await user.click(screen.getByRole('button', { name: 'Add task' }))

    expect(await screen.findByText('Book dentist')).toBeInTheDocument()
    expect(api.lastRequest('POST')?.body).toEqual({ name: 'Book dentist', priority: 'NORMAL', done: false })
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

  it('makes the page behind the edit dialog inert while it is open', async () => {
    api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    expect(taskList().closest('[inert]')).not.toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Search tasks' }).closest('[inert]')).not.toBeNull()
    expect(screen.getByRole('dialog').closest('[inert]')).toBeNull()

    await user.keyboard('{Escape}')
    expect(taskList().closest('[inert]')).toBeNull()
  })

  it('gives the focus back to the Edit button when the dialog closes', async () => {
    api.add('Pay rent')
    const { user } = renderApp()
    const edit = await screen.findByRole('button', { name: 'Edit Pay rent' })

    await user.click(edit)
    await user.keyboard('{Escape}')
    expect(edit).toHaveFocus()

    await user.click(edit)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(edit).toHaveFocus()

    await user.click(edit)
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByRole('textbox', { name: 'Task name' }), ' today')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit Pay rent today' })).toHaveFocus()
  })

  it('keeps the edit dialog open while it saves, so a failed save is still shown', async () => {
    const task = api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit task' })
    api.changeElsewhere(task, { name: 'Pay the rent' })
    const release = api.holdNext('PATCH')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    // Escape, Cancel and the backdrop all leave it open
    await user.keyboard('{Escape}')
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.click(dialog.parentElement!)
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument()

    release()
    expect(await within(dialog).findByText(/Someone else changed this task/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps keyboard focus inside the edit dialog', async () => {
    api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit task' })
    const name = within(dialog).getByRole('textbox', { name: 'Task name' })
    const save = within(dialog).getByRole('button', { name: 'Save changes' })
    expect(name).toHaveFocus()

    // Back from the first field to the last button, and on from there to the first field again
    await user.tab({ shift: true })
    expect(save).toHaveFocus()
    await user.tab()
    expect(name).toHaveFocus()

    // A disabled Save button is skipped: Cancel is the last one then
    await user.clear(name)
    await user.tab({ shift: true })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
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

    // The dialog stays open with the latest version, so the change can be made again on top of it
    const dialog = screen.getByRole('dialog', { name: 'Edit task' })
    const name = within(dialog).getByRole('textbox', { name: 'Task name' })
    await waitFor(() => expect(name).toHaveValue('Pay rent today'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(within(taskList()).getByText('Pay rent today')).toBeInTheDocument()

    await user.type(name, ' and bills')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(api.lastRequest('PATCH')?.body).toEqual({ name: 'Pay rent today and bills', priority: 'NORMAL', version: 1 })
  })

  it('explains when a task to reload was deleted in the meantime', async () => {
    const task = api.add('Pay rent')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    api.changeElsewhere(task, { name: 'Pay rent today' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    api.tasks.splice(api.tasks.indexOf(task), 1)
    await user.click(within(await screen.findByRole('alert')).getByRole('button', { name: 'Reload task' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else deleted this task while you were editing')
    await user.click(screen.getByRole('button', { name: 'Reload list' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers a reload when the task was deleted elsewhere while editing', async () => {
    const task = api.add('Pay rent')
    api.add('Water plants')
    const { user } = renderApp()

    await user.click(await screen.findByRole('button', { name: 'Edit Pay rent' }))
    api.tasks.splice(api.tasks.indexOf(task), 1)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Someone else deleted this task while you were editing')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await user.click(within(alert).getByRole('button', { name: 'Reload list' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(taskNames()).toEqual(['Water plants']))
  })

  it('takes the next click on a task only once the list has its new version', async () => {
    api.add('Pay rent')
    const { user } = renderApp()
    await screen.findByText('Pay rent')

    const releaseReload = api.holdNext('GET')
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))
    await waitFor(() => expect(api.requests.filter((r) => r.method === 'PATCH')).toHaveLength(1))
    // Saved, but the list still holds version 0: a click now would be rejected as a conflict
    expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeDisabled()

    releaseReload()
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeEnabled())
    expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))

    expect(await screen.findByText('Reopened “Pay rent”')).toBeInTheDocument()
    expect(api.requests.filter((r) => r.method === 'PATCH').map((r) => r.body)).toEqual([
      { done: true, version: 0 },
      { done: false, version: 1 },
    ])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('takes no second click on a task while its change is saved', async () => {
    api.add('Pay rent')
    const { user } = renderApp()
    await screen.findByText('Pay rent')

    const release = api.holdNext('PATCH')
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))

    const row = screen.getByRole('listitem')
    expect(row).toHaveAttribute('aria-busy', 'true')
    expect(within(row).getByRole('checkbox', { name: 'Done: Pay rent' })).toBeDisabled()
    expect(within(row).getByRole('button', { name: 'Delete Pay rent' })).toBeDisabled()
    // The dialog would start from the version being replaced, so saving it could only conflict
    expect(within(row).getByRole('button', { name: 'Edit Pay rent' })).toBeDisabled()
    release()
    await waitFor(() => expect(screen.getByRole('listitem')).toHaveAttribute('aria-busy', 'false'))
    expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Edit Pay rent' })).toBeEnabled()
  })

  it('keeps a task locked while it saves, even after another task is clicked', async () => {
    api.add('Water plants')
    api.add('Pay rent')
    const { user } = renderApp()
    await screen.findByText('Pay rent')

    const releaseFirst = api.holdNext('PATCH')
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))
    await user.click(screen.getByRole('checkbox', { name: 'Done: Water plants' }))

    // Pay rent's change is still in flight; another click would send its stale version
    expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Pay rent' })).toBeDisabled()

    releaseFirst()
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeEnabled())
    expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Done: Water plants' })).toBeChecked()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a stale done toggle on its task, which then has the latest version', async () => {
    const task = api.add('Pay rent')
    api.add('Water plants')
    const { user } = renderApp()

    await screen.findByText('Pay rent')
    api.changeElsewhere(task, { name: 'Pay rent today' })
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))

    // The list has reloaded, so the row shows the other change and the next click sends its version
    await screen.findByText('Pay rent today')
    const alert = await within(row('Pay rent today')).findByRole('alert')
    expect(alert).toHaveTextContent('Changed elsewhere, now showing the latest. Try again.')
    expect(within(row('Water plants')).queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent today' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Done: Pay rent today' })).toBeChecked())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('tells in a toast when a task was deleted elsewhere', async () => {
    const task = api.add('Pay rent')
    const { user } = renderApp()

    await screen.findByText('Pay rent')
    api.tasks = api.tasks.filter((t) => t.id !== task.id)
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))

    expect(await screen.findByText('“Pay rent” was deleted elsewhere')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Pay rent')).not.toBeInTheDocument())
  })

  it('shows a failed change on its task until dismissed', async () => {
    api.add('Pay rent')
    const { user } = renderApp()

    await screen.findByText('Pay rent')
    api.failNext('PATCH', 500)
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))

    const alert = await within(row('Pay rent')).findByRole('alert')
    expect(alert).toHaveTextContent('The server ran into a problem. Try again in a moment.')
    await user.click(within(alert).getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a conflict on its task even after another task was clicked', async () => {
    const payRent = api.add('Pay rent')
    api.add('Water plants')
    const { user } = renderApp()
    await screen.findByText('Pay rent')

    const releaseFirst = api.holdNext('PATCH')
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))
    await user.click(screen.getByRole('checkbox', { name: 'Done: Water plants' }))
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Done: Water plants' })).toBeChecked())
    // Changed elsewhere while Pay rent's change waits, so it's rejected after Water plants was saved
    api.changeElsewhere(payRent, { name: 'Pay rent today' })
    releaseFirst()

    await screen.findByText('Pay rent today')
    expect(await within(row('Pay rent today')).findByRole('alert')).toHaveTextContent('Changed elsewhere')
  })

  it('confirms every change, not only the last one clicked', async () => {
    api.add('Pay rent')
    api.add('Water plants')
    const { user } = renderApp()
    await screen.findByText('Pay rent')

    const releaseFirst = api.holdNext('PATCH')
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))
    await user.click(screen.getByRole('checkbox', { name: 'Done: Water plants' }))
    expect(await screen.findByText('Marked “Water plants” as done')).toBeInTheDocument()
    releaseFirst()

    expect(await screen.findByText('Marked “Pay rent” as done')).toBeInTheDocument()
  })

  it('confirms a change that takes the task out of the filtered list', async () => {
    api.add('Pay rent')
    const { user } = renderApp('/?status=open')

    await user.click(await screen.findByRole('checkbox', { name: 'Done: Pay rent' }))

    await waitFor(() => expect(screen.queryByText('Pay rent')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Marked “Pay rent” as done')
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

describe('progress bar', () => {
  const progressBar = () => screen.queryByRole('progressbar', { name: 'Loading' })

  it('shows while the tasks load', async () => {
    api.add('Pay rent')
    const release = api.holdNext('GET')
    renderApp()

    await waitFor(() => expect(progressBar()).toBeInTheDocument())
    release()
    expect(await screen.findByText('Pay rent')).toBeInTheDocument()
    await waitFor(() => expect(progressBar()).not.toBeInTheDocument())
  })

  it('shows while a change is saved', async () => {
    api.add('Pay rent')
    const { user } = renderApp()
    await screen.findByText('Pay rent')
    await waitFor(() => expect(progressBar()).not.toBeInTheDocument())

    const release = api.holdNext('PATCH')
    await user.click(screen.getByRole('checkbox', { name: 'Done: Pay rent' }))

    expect(progressBar()).toBeInTheDocument()
    release()
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Done: Pay rent' })).toBeChecked())
    await waitFor(() => expect(progressBar()).not.toBeInTheDocument())
  })

  it('shows while a new filter result loads', async () => {
    api.add('Pay rent')
    api.add('Water plants', 'NORMAL', true)
    const { user } = renderApp()
    await screen.findByText('Water plants')
    await waitFor(() => expect(progressBar()).not.toBeInTheDocument())

    const release = api.holdNext('GET')
    await user.click(within(screen.getByRole('group', { name: 'Filter by status' })).getByRole('button', { name: 'Open' }))

    await waitFor(() => expect(progressBar()).toBeInTheDocument())
    release()
    await waitFor(() => expect(taskNames()).toEqual(['Pay rent']))
    await waitFor(() => expect(progressBar()).not.toBeInTheDocument())
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

  it('moves to the new last page when the last task on the last page is deleted', async () => {
    for (let i = 1; i <= 21; i++) api.add(`Task ${i}`)
    const { user, router } = renderApp('/?page=1')

    await user.click(await screen.findByRole('button', { name: 'Delete Task 1' }))

    await waitFor(() => expect(taskNames()).toHaveLength(20))
    expect(taskNames()[0]).toBe('Task 21')
    expect(router.state.location.search).toBe('')
    expect(screen.queryByText('No tasks yet. Add the first one above.')).not.toBeInTheDocument()
  })

  it('goes to the last page when the URL points past it', async () => {
    for (let i = 1; i <= 25; i++) api.add(`Task ${i}`)
    const { router } = renderApp('/?page=9')

    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
    await waitFor(() => expect(taskNames()).toHaveLength(5))
    expect(router.state.location.search).toBe('?page=1')
  })
})

describe('routing', () => {
  it('shows a not-found page for unknown paths', async () => {
    renderApp('/nope')

    expect(screen.getByRole('heading', { name: 'This page doesn’t exist' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to your tasks' })).toHaveAttribute('href', '/')
  })
})
