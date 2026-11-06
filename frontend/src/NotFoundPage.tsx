import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">This page doesn’t exist</h1>
      <p className="mt-3 text-muted">
        <Link to="/" className="text-blue-pencil underline underline-offset-4">
          Go to your tasks
        </Link>
      </p>
    </main>
  )
}
