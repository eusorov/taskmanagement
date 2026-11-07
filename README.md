# taskmanagement

A simple task manager: one shared list where you add tasks, give them a priority (low, normal or urgent), mark them done, edit, delete, search, filter and sort them. 

There are no user accounts; everyone who opens the app sees and changes the same list.

This project uses:

- backend with Spring Boot 3, jOOQ, Liquibase and PostgreSQL (see [backend/README.md](backend/README.md) for decisions)
- frontend with React + Vite (see [frontend/README.md](frontend/README.md) for decisions)
- deployment is via Dockerfile and compose

## Run with Docker

Requires Docker with Compose v2.

```sh
cp .env.example .env    # first time only; set POSTGRES_PASSWORD in .env
docker compose up -d --build
```

Open http://localhost (or the port set as `FRONTEND_PORT` in `.env`). The list starts empty.

- Demo tasks: set `SPRING_PROFILES_ACTIVE=dev` in `.env`, and the backend adds 20 sample tasks when the database is empty
- Keep `--build` after changing code or config: the images contain the built app, and without it Compose starts the old ones
- `docker compose logs -f backend` follows the backend logs
- `docker compose stop` stops the app and keeps the data
- `docker compose down -v` also deletes the database volume, and with it all tasks

The frontend container serves the built app and forwards `/api` to the backend, so the browser talks to a single origin. Only the frontend port (80 by default) is published.

## Project layout

- `backend/` — REST API (`/api/tasks`), database migrations, tests
- `frontend/` — React single-page app, typed API client, tests
- `compose.yaml`, `.env.example` — Docker setup for the whole stack

## Run locally for development

Requires JDK 17+, Node 24+ and Docker. Run each in its own terminal:

```sh
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # API on :8080, with 20 demo tasks
cd frontend && npm install && npm run dev                             # app on http://localhost:5173
```

The backend starts Postgres from `backend/compose.dev.yaml` and stops it again on shutdown; the data stays in a Docker volume across restarts. The Vite dev server forwards `/api` to the backend.

For running the tests and regenerating the API client, see the backend and frontend READMEs.
