package de.usorov.taskmanagement.model;

/** Fields to change on a task; {@code null} leaves the field unchanged. */
public record TaskChanges(String name, Priority priority, Boolean done) {}
