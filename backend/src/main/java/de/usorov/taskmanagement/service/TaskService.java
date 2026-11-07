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
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

	/** Soft limit: concurrent creates can exceed it slightly. */
	static final int TASK_LIMIT = 10_000;

	private final TaskRepository taskRepository;
	private final Clock clock;

	// One snapshot for both queries, so a concurrent write can't make total disagree with the page. Read-only
	// transactions never fail with serialization errors in Postgres, so this needs no retry.
	@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
	public TaskPage find(TaskSearch search) {
		return new TaskPage(
				taskRepository.find(search), search.page(), search.size(), taskRepository.count(search));
	}

	@Transactional(readOnly = true)
	public Task get(UUID id) {
		return taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
	}

	@Transactional
	public Task create(String name, Priority priority, boolean done) {
		if (taskRepository.count() >= TASK_LIMIT) {
			log.warn("Task limit of {} reached, rejecting new task", TASK_LIMIT);
			throw new TaskLimitReachedException(TASK_LIMIT);
		}
		Instant now = now();
		Task task = new Task(UUID.randomUUID(), name, priority, done, now, now, 0);
		taskRepository.insert(task);
		log.info("Created task {} with priority {}", task.id(), task.priority());
		return task;
	}

	/** A patch that changes nothing returns the task as it is, without a new version. */
	@Transactional
	public Task update(UUID id, int expectedVersion, TaskChanges changes) {
		Optional<Task> updated = taskRepository.update(id, expectedVersion, changes, now());
		if (updated.isPresent()) {
			log.info("Updated task {} to version {}", id, updated.get().version());
			return updated.get();
		}
		Task current = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
		if (current.version() != expectedVersion) {
			log.info("Rejected update of task {}: version {} is stale", id, expectedVersion);
			throw new VersionConflictException(id, expectedVersion);
		}
		return current;
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
