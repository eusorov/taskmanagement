package de.usorov.taskmanagement.model;

import java.util.regex.Pattern;

/**
 * What counts as an empty task name, shared by request validation and the trimming in the request DTOs, so the two
 * always agree. Code that creates tasks without going through those DTOs must call {@link #strip} itself.
 */
public final class TaskNames {

	/**
	 * Characters that don't show: Unicode whitespace (including the no-break space U+00A0 that {@link String#strip()}
	 * keeps), format characters such as the zero-width space U+200B, and control characters.
	 */
	private static final String INVISIBLE = "\\p{IsWhite_Space}\\p{Cf}\\p{Cc}";

	/** Matches a name with at least one visible character. A compile-time constant, so annotations can use it. */
	public static final String HAS_VISIBLE_CHARACTER = "(?s).*[^" + INVISIBLE + "].*";

	private static final Pattern INVISIBLE_EDGES = Pattern.compile("^[" + INVISIBLE + "]+|[" + INVISIBLE + "]+$");

	private TaskNames() {}

	/** Removes invisible characters from both ends; a valid name never becomes empty. */
	public static String strip(String name) {
		return INVISIBLE_EDGES.matcher(name).replaceAll("");
	}
}
