# Task Management — Frontend

Single-page app for the task list: add tasks, mark them done, edit name and priority, search and filter, page through results. 

## Stack
- React 19
- TypeScript
- Vite
- TanStack Query
- React Router 
- Tailwind CSS

## Requirements

- Node 24+
- The backend running on `localhost:8080` for local development (see [`../backend/README.md`](../backend/README.md))

## Common tasks

| Task | Command |
|---|---|
| Install dependencies | `npm install` |
| Run locally (proxies `/api` to the backend) | `npm run dev` → http://localhost:5173 |
| Run tests | `npm test` |
| Typecheck and lint | `npm run typecheck` and `npm run lint` |
| Production build | `npm run build` (output in `dist/`) |

## API client

The typed client is generated from the backend's OpenAPI spec; both files are committed and never edited by hand:

- `openapi.json` — the spec, saved from the running backend
- `src/api/schema.d.ts` — TypeScript types generated from it, used by `openapi-fetch`

After changing the backend API, with the backend running:

```sh
npm run api:fetch      # save openapi.json from localhost:8080 (or set OPENAPI_URL)
npm run api:generate   # regenerate src/api/schema.d.ts
```

## Layout

- `src/api` — API client, error handling, generated types
- `src/tasks` — the task list page and its components, URL filter mapping, query hooks
- `src/test` — test setup, an in-memory fake of the API, render helper

Tests run in Vitest with Testing Library and use the fake API instead of a real backend.

## design decisions
- one page, with a dialog for editing
- api client generated from openapi spec
- use problem detail
- use nginx for serving react
- use dockerfile and same docker compose as backend
- add success toast messages for actions

## out of scope
- auth (login)
- no JWT
- no undo and no confirmation dialog for delete
- no drag-and-drop reordering
- spinners
- live updates from other users (no websockets)
- offline use (no local storage)
- internationalization
- https (Encrypt certificates)
- outage error handling