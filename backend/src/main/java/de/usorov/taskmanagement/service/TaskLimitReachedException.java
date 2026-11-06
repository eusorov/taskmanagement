package de.usorov.taskmanagement.service;

public class TaskLimitReachedException extends RuntimeException {

	public TaskLimitReachedException(int limit) {
		super("Task limit of " + limit + " reached");
	}
}
