package de.usorov.taskmanagement.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/**
 * OpenAPI description of the RFC 7807 body of every error response. Responses are built as Spring {@code ProblemDetail}
 * in {@code ApiExceptionHandler}; this record documents the same shape.
 */
@Schema(name = "Problem", description = "RFC 7807 problem details", requiredProperties = {"type", "title", "status"})
public record ApiProblem(
		@Schema(example = "about:blank") String type,
		@Schema(example = "Not Found") String title,
		@Schema(example = "404") int status,
		@Schema(example = "Task 0b9f2d1e-6a43-4c1e-9d6e-2f4b8a1c7e55 not found") String detail,
		@Schema(example = "/api/tasks/0b9f2d1e-6a43-4c1e-9d6e-2f4b8a1c7e55") String instance,
		@Schema(description = "Present on validation errors only") List<Violation> violations) {

	@Schema(requiredProperties = {"field", "message"})
	public record Violation(
			@Schema(example = "name") String field, @Schema(example = "must not be blank") String message) {}
}
