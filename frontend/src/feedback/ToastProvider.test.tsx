import { act, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DURATION_MS, ToastProvider } from './ToastProvider'
import { useToast, type ShowToast } from './toastContext'

// The function useToast returned on the latest render
let toast: { current: ShowToast }

beforeEach(() => {
  vi.useFakeTimers()
  toast = renderHook(useToast, { wrapper: ToastProvider }).result
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ToastProvider', () => {
  it('announces a message in a live region and removes it after a few seconds', () => {
    act(() => toast.current('Task added'))

    expect(screen.getByRole('status')).toHaveTextContent('Task added')

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1))
    expect(screen.getByRole('status')).toHaveTextContent('Task added')

    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('replaces the current message with a newer one', () => {
    act(() => toast.current('Task added'))
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS / 2))
    act(() => toast.current('Changes saved'))

    expect(screen.getByRole('status')).toHaveTextContent('Changes saved')
    expect(screen.getByRole('status')).not.toHaveTextContent('Task added')

    // The first message's timer must not remove the second one early
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS / 2))
    expect(screen.getByRole('status')).toHaveTextContent('Changes saved')
  })

  it('cannot be used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(useToast)).toThrow('useToast must be used inside <ToastProvider>')
  })
})
