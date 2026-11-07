package de.usorov.taskmanagement.controller;

import de.usorov.taskmanagement.controller.dto.ApiProblem;
import de.usorov.taskmanagement.controller.dto.CreateTaskRequest;
import de.usorov.taskmanagement.controller.dto.TaskListQuery;
import de.usorov.taskmanagement.controller.dto.TaskPageResponse;
import de.usorov.taskmanagement.controller.dto.TaskResponse;
import de.usorov.taskmanagement.controller.dto.UpdateTaskRequest;
import de.usorov.taskmanagement.model.Task;
import de.usorov.taskmanagement.model.TaskChanges;
import de.usorov.taskmanagement.service.TaskService;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping(path = "/api/tasks", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class TaskController {

	private static final String PROBLEM_JSON = MediaType.APPLICATION_PROBLEM_JSON_VALUE;

	private final TaskService taskService;

	@GetMapping
	@ApiResponse(responseCode = "200", description = "A page of tasks", useReturnTypeSchema = true)
	@ApiResponse(
			responseCode = "400",
			description = "Invalid query parameters",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	public TaskPageResponse list(@Valid @ParameterObject @ModelAttribute TaskListQuery query) {
		return TaskPageResponse.from(taskService.find(query.toSearch()));
	}

	@PostMapping
	@ApiResponse(
			responseCode = "201",
			description = "Task created",
			useReturnTypeSchema = true,
			headers = @Header(name = "Location", description = "URL of the new task"))
	@ApiResponse(
			responseCode = "400",
			description = "Invalid request body",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	@ApiResponse(
			responseCode = "409",
			description = "Task limit reached",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request) {
		Task task = taskService.create(request.name(), request.priority());
		var location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}")
				.buildAndExpand(task.id())
				.toUri();
		return ResponseEntity.created(location).body(TaskResponse.from(task));
	}

	@GetMapping("/{id}")
	@ApiResponse(responseCode = "200", description = "The task", useReturnTypeSchema = true)
	@ApiResponse(
			responseCode = "400",
			description = "Invalid task id",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	@ApiResponse(
			responseCode = "404",
			description = "Task not found",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	public TaskResponse get(@PathVariable UUID id) {
		return TaskResponse.from(taskService.get(id));
	}

	@PatchMapping(path = "/{id}", consumes = {"application/json", "application/merge-patch+json"})
	@ApiResponse(responseCode = "200", description = "The updated task", useReturnTypeSchema = true)
	@ApiResponse(
			responseCode = "400",
			description = "Invalid id or request body",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	@ApiResponse(
			responseCode = "404",
			description = "Task not found",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	@ApiResponse(
			responseCode = "409",
			description = "Version conflict: the task was changed by someone else",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	public TaskResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateTaskRequest request) {
		var changes = new TaskChanges(request.name(), request.priority(), request.done());
		return TaskResponse.from(taskService.update(id, request.version(), changes));
	}

	@DeleteMapping("/{id}")
	@ApiResponse(responseCode = "204", description = "Task deleted")
	@ApiResponse(
			responseCode = "400",
			description = "Invalid task id",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	@ApiResponse(
			responseCode = "404",
			description = "Task not found",
			content = @Content(mediaType = PROBLEM_JSON, schema = @Schema(implementation = ApiProblem.class)))
	public ResponseEntity<Void> delete(@PathVariable UUID id) {
		taskService.delete(id);
		return ResponseEntity.noContent().build();
	}
}
