package de.usorov.taskmanagement.service;

import java.util.UUID;

public class VersionConflictException extends RuntimeException {

	public VersionConflictException(UUID id, int expectedVersion) {
		super("Task " + id + " was changed by someone else (expected version " + expectedVersion + ")");
	}
}
