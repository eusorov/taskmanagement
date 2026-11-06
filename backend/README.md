# Task Management — Backend

REST API for the task management. It is a simple implementation of the homework.

Spring Boot 3.5, Java 17, PostgreSQL, jOOQ for data access and Liquibase for schema migrations. 


## Requirements

- JDK 17+
- Docker (Testcontainers starts Postgres for tests, local runs and jOOQ codegen)

## Common tasks

- Run tests | `./mvnw test`
- Run locally with a throwaway Postgres | `./mvnw spring-boot:test-run`
- Generate jOOQ sources | `./mvnw -Pjooq-codegen generate-sources`

## Design decisions
- no auth was required, to keep simple no auth was implemented
- without auth there is no user connections to tasks, everyone can read tasks
- JOOQ was chosen over JPA because, so there is more control over SQL
- add connection pool
- For REST errors use ProblemDetails
- add OpenAPI doc and document controller to create later client for the frontend 
- add spring actuator endpoints for health checks
- use dockerfile and docker compose for simple deployment (no kubernetes)
- use Lombok for simplicity 
- add webMvcTests and integration tests for controller