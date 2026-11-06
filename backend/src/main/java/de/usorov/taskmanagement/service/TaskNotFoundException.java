package de.usorov.taskmanagement.service;

import java.util.UUID;

public class TaskNotFoundException extends RuntimeException {

	public TaskNotFoundException(UUID id) {
		super("Task " + id + " not found");
	}
}
