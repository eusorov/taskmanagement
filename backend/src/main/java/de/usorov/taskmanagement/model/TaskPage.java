package de.usorov.taskmanagement.model;

import java.util.List;

public record TaskPage(List<Task> items, int page, int size, long total) {}
