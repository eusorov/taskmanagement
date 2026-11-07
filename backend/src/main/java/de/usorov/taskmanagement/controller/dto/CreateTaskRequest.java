package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.controller.validation.TaskName;
import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.TaskNames;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** A new task. Defaults are applied here, so the service always gets complete values. */
public record CreateTaskRequest(
		@NotNull(message = "must not be blank") @TaskName @Schema(maxLength = 500) String name,
		@Schema(defaultValue = "NORMAL") Priority priority,
		@Schema(defaultValue = "false") Boolean done) {

	public CreateTaskRequest {
		name = name == null ? null : TaskNames.strip(name);
		priority = priority == null ? Priority.NORMAL : priority;
		done = done != null && done;
	}
}
