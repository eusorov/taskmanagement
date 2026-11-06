package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.model.Priority;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Merge patch of a task. Absent fields stay unchanged; every task field is required, so {@code null} also means
 * unchanged. {@code version} is the version the client last saw.
 */
public record UpdateTaskRequest(
		@Pattern(regexp = ".*\\S.*", message = "must not be blank") @Size(max = 500) String name,
		Priority priority,
		Boolean done,
		@NotNull Integer version) {}
