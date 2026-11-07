# taskmanagement

A simple task manager: one shared list where you add tasks, give them a priority (low, normal or urgent), mark them done, edit, delete, search, filter and sort them. 

There are no user accounts; everyone who opens the app sees and changes the same list.

This project uses:

- backend with Spring Boot 3, jOOQ, Liquibase and PostgreSQL (see [backend/README.md](backend/README.md) for decisions)
- frontend with React + Vite (see [frontend/README.md](frontend/README.md) for decisions)
- deployment is via Dockerfile and compose, or Kubernetes with a Helm chart (`helm/taskmanagement`)

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

## Run on Kubernetes (Helm)

Tested with minikube; any cluster works if it can use locally built images. Requires Helm with OCI chart support (3.8+; tested with 4.3). From the repository root:

```sh
docker compose build    # builds taskmanagement-backend:local and taskmanagement-frontend:local
minikube image load taskmanagement-backend:local taskmanagement-frontend:local
kubectl create namespace taskmanagement    # first time only (this and the next line)
kubectl label namespace taskmanagement pod-security.kubernetes.io/enforce=restricted    # rejects pods that would run as root
helm dependency update helm/taskmanagement
helm upgrade --install taskmanagement helm/taskmanagement -n taskmanagement --wait
kubectl -n taskmanagement port-forward svc/taskmanagement-frontend 8080:8080
```

Open http://localhost:8080. Settings (images, replicas, resources, database size) are in `helm/taskmanagement/values.yaml`.

- Postgres comes from the [Bitnami chart](https://github.com/bitnami/charts/tree/main/bitnami/postgresql). Its free images are published as `latest` only, so the chart pins one by digest (Postgres 18.6); to update, set a new `postgresql.image.digest`
- The database password is generated on install and kept in the Secret `taskmanagement-postgresql`
- Migrations run in a Job on every install and upgrade, never in the backend pods, so replicas don't race to apply them
- After code changes: rebuild, `minikube image load` again, run the `helm upgrade --install` line (it applies new migrations), then `kubectl -n taskmanagement rollout restart deploy/taskmanagement-backend deploy/taskmanagement-frontend` (the `local` tag doesn't change, so Kubernetes doesn't see a new image by itself)
- Every pod runs as non-root with a read-only root filesystem and no capabilities
- Postgres and Actuator (9000) are only reachable inside the cluster
- `helm uninstall taskmanagement -n taskmanagement` keeps the database volume but deletes the generated password, so a reinstall can't log in to the old data. Also run `kubectl -n taskmanagement delete pvc data-taskmanagement-postgresql-0` (deletes all tasks), or delete the namespace

## Project layout

- `backend/` — REST API (`/api/tasks`), database migrations, tests
- `frontend/` — React single-page app, typed API client, tests
- `compose.yaml`, `.env.example` — Docker setup for the whole stack
- `helm/taskmanagement/` — Helm chart for the whole stack (Postgres from the Bitnami chart)

## Run locally for development

Requires JDK 17+, Node 24+ and Docker. Run each in its own terminal:

```sh
cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # API on :8080, with 20 demo tasks
cd frontend && npm install && npm run dev                             # app on http://localhost:5173
```

The backend starts Postgres from `backend/compose.dev.yaml` and stops it again on shutdown; the data stays in a Docker volume across restarts. The Vite dev server forwards `/api` to the backend.

For running the tests and regenerating the API client, see the backend and frontend READMEs.
