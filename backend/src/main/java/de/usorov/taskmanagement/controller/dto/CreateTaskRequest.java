package de.usorov.taskmanagement.controller.dto;

import de.usorov.taskmanagement.model.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code priority} defaults to {@code NORMAL}. */
public record CreateTaskRequest(@NotBlank @Size(max = 500) String name, Priority priority) {}
