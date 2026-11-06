package de.usorov.taskmanagement.repository;

import static de.usorov.taskmanagement.db.jooq.Tables.TASKS;

import de.usorov.taskmanagement.db.jooq.enums.TaskPriority;
import de.usorov.taskmanagement.db.jooq.tables.records.TasksRecord;
import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.Task;
import de.usorov.taskmanagement.model.TaskChanges;
import de.usorov.taskmanagement.model.TaskSearch;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.Field;
import org.jooq.SortField;
import org.jooq.SortOrder;
import org.jooq.UpdateSetMoreStep;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class TaskRepository {

	private final DSLContext dsl;

	public Optional<Task> findById(UUID id) {
		return dsl.selectFrom(TASKS).where(TASKS.ID.eq(id)).fetchOptional().map(TaskRepository::toTask);
	}

	public boolean existsById(UUID id) {
		return dsl.fetchExists(TASKS, TASKS.ID.eq(id));
	}

	public int count() {
		return dsl.fetchCount(TASKS);
	}

	public List<Task> find(TaskSearch search) {
		return dsl.selectFrom(TASKS)
				.where(conditionFor(search))
				.orderBy(orderFor(search))
				.limit(search.size())
				.offset((long) search.page() * search.size())
				.fetch(TaskRepository::toTask);
	}

	public long count(TaskSearch search) {
		return dsl.fetchCount(TASKS, conditionFor(search));
	}

	public void insert(Task task) {
		dsl.insertInto(TASKS)
				.set(TASKS.ID, task.id())
				.set(TASKS.NAME, task.name())
				.set(TASKS.PRIORITY, toTaskPriority(task.priority()))
				.set(TASKS.DONE, task.done())
				.set(TASKS.CREATED_AT, task.createdAt())
				.set(TASKS.UPDATED_AT, task.updatedAt())
				.set(TASKS.VERSION, task.version())
				.execute();
	}

	/**
	 * Applies {@code changes} in a single statement if the task still has {@code expectedVersion}.
	 *
	 * @return the updated task, or empty if the task is missing or its version differs
	 */
	public Optional<Task> update(UUID id, int expectedVersion, TaskChanges changes, Instant now) {
		UpdateSetMoreStep<TasksRecord> update = dsl.update(TASKS)
				.set(TASKS.UPDATED_AT, now)
				.set(TASKS.VERSION, TASKS.VERSION.plus(1));
		if (changes.name() != null) {
			update = update.set(TASKS.NAME, changes.name());
		}
		if (changes.priority() != null) {
			update = update.set(TASKS.PRIORITY, toTaskPriority(changes.priority()));
		}
		if (changes.done() != null) {
			update = update.set(TASKS.DONE, changes.done());
		}
		return update.where(TASKS.ID.eq(id).and(TASKS.VERSION.eq(expectedVersion)))
				.returning()
				.fetchOptional()
				.map(TaskRepository::toTask);
	}

	public boolean deleteById(UUID id) {
		return dsl.deleteFrom(TASKS).where(TASKS.ID.eq(id)).execute() > 0;
	}

	private static Condition conditionFor(TaskSearch search) {
		Condition condition = DSL.noCondition();
		if (search.done() != null) {
			condition = condition.and(TASKS.DONE.eq(search.done()));
		}
		if (!search.priorities().isEmpty()) {
			condition = condition.and(TASKS.PRIORITY.in(
					search.priorities().stream().map(TaskRepository::toTaskPriority).toList()));
		}
		if (search.query() != null) {
			// containsIgnoreCase escapes % and _ in the search text
			condition = condition.and(TASKS.NAME.containsIgnoreCase(search.query()));
		}
		return condition;
	}

	private static List<SortField<?>> orderFor(TaskSearch search) {
		List<SortField<?>> order = new ArrayList<>();
		if (search.groupDone()) {
			order.add(TASKS.DONE.asc());
		}
		if (search.sortField() == null) {
			order.add(TASKS.PRIORITY.desc());
			order.add(TASKS.CREATED_AT.desc());
		} else {
			order.add(columnFor(search).sort(search.ascending() ? SortOrder.ASC : SortOrder.DESC));
		}
		// Stable order across pages
		order.add(TASKS.ID.asc());
		return order;
	}

	private static Field<?> columnFor(TaskSearch search) {
		return switch (search.sortField()) {
			case PRIORITY -> TASKS.PRIORITY;
			case CREATED_AT -> TASKS.CREATED_AT;
			case UPDATED_AT -> TASKS.UPDATED_AT;
			case NAME -> TASKS.NAME;
		};
	}

	private static Task toTask(TasksRecord record) {
		return new Task(
				record.getId(),
				record.getName(),
				Priority.valueOf(record.getPriority().getLiteral()),
				record.getDone(),
				record.getCreatedAt(),
				record.getUpdatedAt(),
				record.getVersion());
	}

	private static TaskPriority toTaskPriority(Priority priority) {
		return TaskPriority.valueOf(priority.name());
	}
}
