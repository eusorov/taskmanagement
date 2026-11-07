import type { RouteObject } from 'react-router'
import { Layout } from './Layout'
import { NotFoundPage } from './NotFoundPage'
import { TaskListPage } from './tasks/TaskListPage'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <TaskListPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
