package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.controller.validation.TaskName;
import de.usorov.taskmanagement.model.Priority;
import jakarta.validation.constraints.NotNull;

/** {@code priority} defaults to {@code NORMAL}. */
public record CreateTaskRequest(@NotNull(message = "must not be blank") @TaskName String name, Priority priority) {}
