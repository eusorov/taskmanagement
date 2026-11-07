import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext } from './toastContext'

export const TOAST_DURATION_MS = 4000

interface Toast {
  id: number
  message: string
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())

  const showToast = useCallback((message: string) => {
    const id = nextId.current++
    // Newest only: a burst of actions shouldn't stack up a column of messages
    setToasts([{ id, message }])
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, TOAST_DURATION_MS)
    timers.current.add(timer)
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  return (
    <ToastContext value={showToast}>
      {children}
      {/* Always rendered, so screen readers announce each new message */}
      <div
        role="status"
        data-testid="toasts"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            data-testid="toast"
            className="animate-toast-in flex items-center gap-3 rounded-md bg-ink py-2.5 pr-4 pl-3 text-white shadow-lg"
          >
            <span aria-hidden className="h-5 w-1 rounded-full bg-blue-pencil" />
            {toast.message}
          </p>
        ))}
      </div>
    </ToastContext>
  )
}
