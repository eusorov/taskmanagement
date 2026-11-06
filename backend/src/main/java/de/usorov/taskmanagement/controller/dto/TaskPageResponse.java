package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.model.TaskPage;
import java.util.List;

public record TaskPageResponse(List<TaskResponse> items, int page, int size, long total) {

	public static TaskPageResponse from(TaskPage page) {
		return new TaskPageResponse(
				page.items().stream().map(TaskResponse::from).toList(), page.page(), page.size(), page.total());
	}
}
