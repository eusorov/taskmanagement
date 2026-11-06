package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.model.TaskPage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(requiredProperties = {"items", "page", "size", "total"})
public record TaskPageResponse(List<TaskResponse> items, int page, int size, long total) {

	public static TaskPageResponse from(TaskPage page) {
		return new TaskPageResponse(
				page.items().stream().map(TaskResponse::from).toList(), page.page(), page.size(), page.total());
	}
}
