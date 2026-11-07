# Task Management — Backend

REST API for the task management. It is a simple implementation of the homework.

Spring Boot 3.5, Java 17, PostgreSQL, jOOQ for data access and Liquibase for schema migrations. 


## Requirements

- JDK 17+
- Docker (Postgres for local runs, tests and jOOQ codegen)

## Common tasks

| Task                                  | Command |
|---------------------------------------|---------------|
| Run tests                             | `./mvnw test` |
| Run locally                           | `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` (starts Postgres from `compose.dev.yaml`, data kept across restarts, demo tasks in an empty database) |
| Delete the local dev database         | `docker compose -f compose.dev.yaml down -v` |
| Generate jOOQ sources                 | `./mvnw -Pjooq-codegen generate-sources`|
| Run the whole stack with demo tasks   | `SPRING_PROFILES_ACTIVE=dev docker compose up -d --build` (from the repository root) |

## Design decisions

- No authentication, as none was required. Without users, tasks belong to no one: everyone reads and changes the same list.
- jOOQ instead of JPA: every query is written out, so there are no hidden N+1 queries and the SQL stays under control.
- Plain REST (`GET`, `POST`, `PATCH`, `DELETE` on `/api/tasks`); GraphQL would add little for one resource.
- Concurrent edits are caught with a `version` per task: a `PATCH` with a stale version is rejected with 409.
- Errors are RFC 7807 problem details (`ProblemDetail`); validation errors list each invalid field.
- Lists are paged with page and size; each order the UI offers and the name search have an index.
- The API is documented with OpenAPI, from which the frontend's typed client is generated.
- Hikari's connection pool is capped at 10 connections per instance (`application.yaml`).
- Actuator health, info and metrics run on a separate port (9000) that is never published.
- Deployment is a Dockerfile plus Docker Compose; no Kubernetes.
- Lombok for constructors and loggers.
- Tests: `@WebMvcTest` for the controller, integration tests against a real Postgres (Testcontainers) for the rest.
- The `dev` profile adds 20 demo tasks on startup when the database is empty.

## Out of scope

- Authentication and authorization
- Caching
- Kubernetes deployment
- Tracing
- API versioning
- Native image
- Query tuning beyond the indexes above
- Cursor-based paging for very large tables
- Retries and graceful handling of a database outage
- Rate limiting
- HTTPS
- Security response headers
- Secrets management
- CI (e.g. GitHub Actions): run `./mvnw verify` locally before building images
- Static analysis and coverage (e.g. Sonar)
- Load tests