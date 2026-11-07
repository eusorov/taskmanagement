package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.controller.validation.NoNulCharacters;
import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.TaskSearch;
import de.usorov.taskmanagement.model.TaskSortField;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;

/**
 * Query parameters of {@code GET /api/tasks}. {@code sort} defaults to {@code priority}; {@code order} defaults to asc
 * for {@code name} and desc otherwise. Open tasks come before done ones unless {@code groupDone=false}.
 */
public record TaskListQuery(
		Boolean done,
		List<Priority> priority,
		@Size(max = 500) @NoNulCharacters String q,
		@Schema(allowableValues = {"priority", "createdAt", "updatedAt", "name"}, defaultValue = DEFAULT_SORT)
				@Pattern(regexp = "priority|createdAt|updatedAt|name")
				String sort,
		@Schema(allowableValues = {"asc", "desc"}) @Pattern(regexp = "asc|desc") String order,
		Boolean groupDone,
		@Min(0) Integer page,
		@Min(1) @Max(200) Integer size) {

	static final String DEFAULT_SORT = "priority";
	static final int DEFAULT_SIZE = 50;

	public TaskSearch toSearch() {
		TaskSortField sortField = switch (sort == null ? DEFAULT_SORT : sort) {
			case "priority" -> TaskSortField.PRIORITY;
			case "createdAt" -> TaskSortField.CREATED_AT;
			case "updatedAt" -> TaskSortField.UPDATED_AT;
			default -> TaskSortField.NAME;
		};
		boolean ascending = order == null ? sortField == TaskSortField.NAME : order.equals("asc");
		return new TaskSearch(
				done,
				priorities(),
				q == null || q.isBlank() ? null : q.strip(),
				sortField,
				ascending,
				groupDone == null || groupDone,
				page == null ? 0 : page,
				size == null ? DEFAULT_SIZE : size);
	}

	// Empty entries, as in "priority=URGENT," or "priority=", arrive as null and are ignored
	private EnumSet<Priority> priorities() {
		EnumSet<Priority> priorities = EnumSet.noneOf(Priority.class);
		if (priority != null) {
			priority.stream().filter(Objects::nonNull).forEach(priorities::add);
		}
		return priorities;
	}
}
