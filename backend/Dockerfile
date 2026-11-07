# syntax=docker/dockerfile:1

# Build: tests are skipped here because they need Docker (Testcontainers); run ./mvnw verify before building
FROM eclipse-temurin:17.0.21_9-jdk-noble AS build
WORKDIR /build
COPY mvnw pom.xml ./
COPY .mvn .mvn
COPY src src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q package -DskipTests \
    && java -Djarmode=tools -jar target/taskmanagement-*.jar extract --layers --launcher --destination extracted

# Run: one layer per Spring Boot jar layer, so code changes don't re-ship dependencies
FROM eclipse-temurin:17.0.21_9-jre-noble
RUN groupadd --system app && useradd --system --gid app --no-create-home app
WORKDIR /app
COPY --from=build /build/extracted/dependencies/ ./
COPY --from=build /build/extracted/spring-boot-loader/ ./
COPY --from=build /build/extracted/snapshot-dependencies/ ./
COPY --from=build /build/extracted/application/ ./
USER app
# 8080: API, 9000: Actuator (internal only)
EXPOSE 8080 9000
# Heap sized from the container memory limit; set here, not via JAVA_TOOL_OPTIONS, which prints a non-JSON line
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "org.springframework.boot.loader.launch.JarLauncher"]
