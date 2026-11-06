import type { RouteObject } from 'react-router'
import { NotFoundPage } from './NotFoundPage'
import { TaskListPage } from './tasks/TaskListPage'

export const routes: RouteObject[] = [
  { path: '/', element: <TaskListPage /> },
  { path: '*', element: <NotFoundPage /> },
]
