package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.Task;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

// Every field is always present
@Schema(requiredProperties = {"id", "name", "priority", "done", "createdAt", "updatedAt", "version"})
public record TaskResponse(
		UUID id, String name, Priority priority, boolean done, Instant createdAt, Instant updatedAt, int version) {

	public static TaskResponse from(Task task) {
		return new TaskResponse(
				task.id(),
				task.name(),
				task.priority(),
				task.done(),
				task.createdAt(),
				task.updatedAt(),
				task.version());
	}
}
