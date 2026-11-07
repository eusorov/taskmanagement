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
| run docker in dev mode                | SPRING_PROFILES_ACTIVE=dev docker compose up -d|

## Design decisions
- no auth was required, to keep simple no auth was implemented
- without auth there is no user connections to tasks, everyone can read tasks
- JOOQ was chosen over JPA because, avoids N+1 and there is more control over SQL
- add connection pool
- use REST API (GET, POST, PATCH, DELETE) no graphql for simplicity
- For REST errors use ProblemDetails
- use simple paging if there are many tasks
- add OpenAPI doc and document controller to create later client for the frontend 
- add spring actuator endpoints for health checks
- use dockerfile and docker compose for simple deployment (no kubernetes)
- use Lombok for simplicity 
- add webMvcTests and integration tests for controller
- add 20 demo tasks on startup if db is empty, only in the `dev` profile

## out of scope
- auth
- caching
- kubernetes deployment
- traces
- api versioning
- native image
- db performance
- db cursor if db gets too big
- retry /failur handling for db outage
- rate limiting
- https
- Security request headers
- Secrets management
- github actions
- static analysis + coverage (sonar)
- load tests