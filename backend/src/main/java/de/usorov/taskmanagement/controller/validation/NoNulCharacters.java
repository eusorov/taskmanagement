package de.usorov.taskmanagement.controller.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.ReportAsSingleViolation;
import jakarta.validation.constraints.Pattern;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.*;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

/**
 * Text without the NUL character. Postgres text cannot hold it, so it is rejected here with a 400 instead of failing
 * in the database with a 500. Put it on every request text that reaches a query; {@code null} is valid.
 */
@Documented
@Pattern(regexp = "[^\\x00]*")
@ReportAsSingleViolation
@Constraint(validatedBy = {})
@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
public @interface NoNulCharacters {

	String message() default "must not contain NUL characters";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};
}
