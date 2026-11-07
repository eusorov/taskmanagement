package de.usorov.taskmanagement.controller.validation;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import de.usorov.taskmanagement.model.TaskNames;
import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.Pattern;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * A task name: at most 500 characters (code points, so an emoji counts once), at least one visible character, no NUL.
 * Matches the database's {@code CHECK (char_length(name) BETWEEN 1 AND 500)}. {@code null} is valid, because an update
 * may leave the name out; add {@code @NotNull} where it is required. Each broken rule is reported with its own message.
 * Springdoc doesn't see the length here, so fields add {@code @Schema(maxLength = 500)}.
 */
@Documented
@MaxCodePoints(500)
// Whitespace of any kind, zero-width and control characters alone count as blank
@Pattern(regexp = TaskNames.HAS_VISIBLE_CHARACTER, message = "must not be blank")
@NoNulCharacters
@Constraint(validatedBy = {})
@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
public @interface TaskName {

	String message() default "invalid task name";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};
}
