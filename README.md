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

Open http://localhost. On first start with an empty database, the backend adds 20 demo tasks.

- `docker compose logs -f backend` follows the backend logs
- `docker compose stop` stops the app and keeps the data
- `docker compose down -v` also deletes the database volume, and with it all tasks

The frontend container serves the built app and forwards `/api` to the backend, so the browser talks to a single origin. Only port 80 is published.

## Project layout

- `backend/` — REST API (`/api/tasks`), database migrations, tests
- `frontend/` — React single-page app, typed API client, tests
- `compose.yaml`, `.env.example` — Docker setup for the whole stack

For local development without Docker, and for running the tests, see the backend and frontend READMEs.
