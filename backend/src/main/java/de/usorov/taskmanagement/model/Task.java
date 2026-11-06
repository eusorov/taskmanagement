package de.usorov.taskmanagement.model;

import java.time.Instant;
import java.util.UUID;

public record Task(
		UUID id, String name, Priority priority, boolean done, Instant createdAt, Instant updatedAt, int version) {}
