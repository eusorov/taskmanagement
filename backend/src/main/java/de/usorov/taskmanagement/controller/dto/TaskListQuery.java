package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.TaskSearch;
import de.usorov.taskmanagement.model.TaskSortField;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.EnumSet;
import java.util.List;

/**
 * Query parameters of {@code GET /api/tasks}. Without {@code sort} tasks are ordered by priority desc, then createdAt
 * desc; {@code order} defaults to asc for {@code name} and desc otherwise. Open tasks come before done ones unless
 * {@code groupDone=false}.
 */
public record TaskListQuery(
		Boolean done,
		List<Priority> priority,
		@Size(max = 500) String q,
		@Pattern(regexp = "priority|createdAt|updatedAt|name") String sort,
		@Pattern(regexp = "asc|desc") String order,
		Boolean groupDone,
		@Min(0) Integer page,
		@Min(1) @Max(200) Integer size) {

	static final int DEFAULT_SIZE = 50;

	public TaskSearch toSearch() {
		TaskSortField sortField = sort == null ? null : switch (sort) {
			case "priority" -> TaskSortField.PRIORITY;
			case "createdAt" -> TaskSortField.CREATED_AT;
			case "updatedAt" -> TaskSortField.UPDATED_AT;
			default -> TaskSortField.NAME;
		};
		boolean ascending = order == null ? sortField == TaskSortField.NAME : order.equals("asc");
		return new TaskSearch(
				done,
				priority == null || priority.isEmpty() ? EnumSet.noneOf(Priority.class) : EnumSet.copyOf(priority),
				q == null || q.isBlank() ? null : q.strip(),
				sortField,
				ascending,
				groupDone == null || groupDone,
				page == null ? 0 : page,
				size == null ? DEFAULT_SIZE : size);
	}
}
