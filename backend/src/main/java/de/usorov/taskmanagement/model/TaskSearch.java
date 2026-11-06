package de.usorov.taskmanagement.model;

import java.util.Set;

/**
 * Filter, order and page for listing tasks.
 *
 * @param done only done or only open tasks; {@code null} for all
 * @param priorities allowed priorities; empty for all
 * @param query case-insensitive substring of the name; {@code null} for all
 * @param sortField explicit sort; {@code null} for the default {@code priority desc, createdAt desc}
 * @param ascending direction of {@code sortField}
 * @param groupDone sort open tasks before done ones, ahead of everything else
 */
public record TaskSearch(
		Boolean done,
		Set<Priority> priorities,
		String query,
		TaskSortField sortField,
		boolean ascending,
		boolean groupDone,
		int page,
		int size) {}
