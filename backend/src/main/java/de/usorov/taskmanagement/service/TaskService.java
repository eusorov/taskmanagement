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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

	/** Soft limit: concurrent creates can exceed it slightly. */
	static final int TASK_LIMIT = 10_000;

	private final TaskRepository taskRepository;
	private final Clock clock;

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
			log.warn("Task limit of {} reached, rejecting new task", TASK_LIMIT);
			throw new TaskLimitReachedException(TASK_LIMIT);
		}
		Instant now = now();
		Task task = new Task(
				UUID.randomUUID(), name, priority == null ? Priority.NORMAL : priority, false, now, now, 0);
		taskRepository.insert(task);
		log.info("Created task {} with priority {}", task.id(), task.priority());
		return task;
	}

	@Transactional
	public Task update(UUID id, int expectedVersion, TaskChanges changes) {
		Task updated = taskRepository.update(id, expectedVersion, changes, now()).orElseThrow(() -> {
			if (taskRepository.existsById(id)) {
				log.info("Rejected update of task {}: version {} is stale", id, expectedVersion);
				return new VersionConflictException(id, expectedVersion);
			}
			return new TaskNotFoundException(id);
		});
		log.info("Updated task {} to version {}", id, updated.version());
		return updated;
	}

	@Transactional
	public void delete(UUID id) {
		if (!taskRepository.deleteById(id)) {
			throw new TaskNotFoundException(id);
		}
		log.info("Deleted task {}", id);
	}

	// Postgres stores microseconds; truncating keeps written and read values equal
	private Instant now() {
		return clock.instant().truncatedTo(ChronoUnit.MICROS);
	}
}
