package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.controller.validation.TaskName;
import de.usorov.taskmanagement.model.Priority;
import jakarta.validation.constraints.NotNull;

/**
 * Merge patch of a task. Absent fields stay unchanged; every task field is required, so {@code null} also means
 * unchanged. {@code version} is the version the client last saw.
 */
public record UpdateTaskRequest(
		@TaskName String name,
		Priority priority,
		Boolean done,
		@NotNull Integer version) {}
