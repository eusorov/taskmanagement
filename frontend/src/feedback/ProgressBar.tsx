import { useIsFetching, useIsMutating } from '@tanstack/react-query'

/**
 * A thin bar across the top of the page while any request is in flight: loading tasks or saving a change. The API
 * reports no progress, so it slides instead of filling. It fades in after a short delay, so quick requests never
 * flash it.
 */
export function ProgressBar() {
  const busy = useIsFetching() + useIsMutating() > 0
  if (!busy) return null
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      data-testid="progress-bar"
      className="animate-progress-in fixed inset-x-0 top-0 z-30 h-1 overflow-hidden bg-blue-pencil/20"
    >
      {/* Without motion it stays put and spans the whole width */}
      <div className="animate-progress-slide h-full w-1/3 bg-blue-pencil motion-reduce:w-full" />
    </div>
  )
}
