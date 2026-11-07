import { useEffect } from 'react'
import { Link } from 'react-router'

export function NotFoundPage() {
  // The tab title is the first thing a screen reader reads on a new page
  useEffect(() => {
    const previous = document.title
    document.title = 'Page not found · Tasks'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <main data-testid="not-found-page" className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">This page doesn’t exist</h1>
      <p className="mt-3 text-muted">
        <Link to="/" data-testid="not-found-home" className="text-blue-pencil underline underline-offset-4">
          Go to your tasks
        </Link>
      </p>
    </main>
  )
}
