package de.usorov.taskmanagement.service;

import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.Task;
import de.usorov.taskmanagement.model.TaskChanges;
import de.usorov.taskmanagement.model.TaskPage;
import de.usorov.taskmanagement.model.TaskSearch;
import de.usorov.taskmanagement.repository.TaskRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

	/** Soft limit: concurrent creates can exceed it slightly. */
	static final int TASK_LIMIT = 10_000;

	private final TaskRepository taskRepository;
	private final Clock clock;

	public TaskService(TaskRepository taskRepository, Clock clock) {
		this.taskRepository = taskRepository;
		this.clock = clock;
	}

	@Transactional(readOnly = true)
	public TaskPage find(TaskSearch search) {
		return new TaskPage(
				taskRepository.find(search), search.page(), search.size(), taskRepository.count(search));
	}

	@Transactional(readOnly = true)
	public Task get(UUID id) {
		return taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
	}

	@Transactional
	public Task create(String name, Priority priority) {
		if (taskRepository.count() >= TASK_LIMIT) {
			throw new TaskLimitReachedException(TASK_LIMIT);
		}
		Instant now = now();
		Task task = new Task(
				UUID.randomUUID(), name.strip(), priority == null ? Priority.NORMAL : priority, false, now, now, 0);
		taskRepository.insert(task);
		return task;
	}

	@Transactional
	public Task update(UUID id, int expectedVersion, TaskChanges changes) {
		TaskChanges stripped = new TaskChanges(
				changes.name() == null ? null : changes.name().strip(), changes.priority(), changes.done());
		return taskRepository.update(id, expectedVersion, stripped, now()).orElseThrow(() -> {
			if (taskRepository.existsById(id)) {
				return new VersionConflictException(id, expectedVersion);
			}
			return new TaskNotFoundException(id);
		});
	}

	@Transactional
	public void delete(UUID id) {
		if (!taskRepository.deleteById(id)) {
			throw new TaskNotFoundException(id);
		}
	}

	// Postgres stores microseconds; truncating keeps written and read values equal
	private Instant now() {
		return clock.instant().truncatedTo(ChronoUnit.MICROS);
	}
}
