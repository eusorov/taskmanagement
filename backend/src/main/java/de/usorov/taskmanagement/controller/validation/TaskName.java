package de.usorov.taskmanagement.controller.validation;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * A task name: at most 500 characters, at least one that isn't whitespace, no NUL. Matches the database's
 * {@code CHECK (char_length(name) BETWEEN 1 AND 500)}. {@code null} is valid, because an update may leave the name
 * out; add {@code @NotNull} where it is required. Each broken rule is reported with its own message.
 */
@Documented
@Size(max = 500, message = "must be at most 500 characters")
// (?s): "." also matches line breaks, so a name with a newline isn't mistaken for a blank one
@Pattern(regexp = "(?s).*\\S.*", message = "must not be blank")
@NoNulCharacters
@Constraint(validatedBy = {})
@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
public @interface TaskName {

	String message() default "invalid task name";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};
}
