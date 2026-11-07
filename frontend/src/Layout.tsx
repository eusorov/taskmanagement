import { Outlet } from 'react-router'
import { ProgressBar } from './feedback/ProgressBar'

/** Around every page, so the progress bar shows wherever a request runs. */
export function Layout() {
  return (
    <>
      <ProgressBar />
      <Outlet />
    </>
  )
}
