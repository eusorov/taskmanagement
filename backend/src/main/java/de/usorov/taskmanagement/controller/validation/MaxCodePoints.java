package de.usorov.taskmanagement.controller.validation;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * Text of at most {@link #value} Unicode code points, the unit of Postgres {@code char_length}. {@code @Size} counts
 * UTF-16 units instead, so an emoji counts twice there; {@code null} is valid.
 */
@Documented
@Constraint(validatedBy = MaxCodePoints.Validator.class)
@Target({FIELD, METHOD, PARAMETER, ANNOTATION_TYPE})
@Retention(RUNTIME)
public @interface MaxCodePoints {

	int value();

	String message() default "must be at most {value} characters";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

	class Validator implements ConstraintValidator<MaxCodePoints, CharSequence> {

		private int max;

		@Override
		public void initialize(MaxCodePoints constraint) {
			max = constraint.value();
		}

		@Override
		public boolean isValid(CharSequence text, ConstraintValidatorContext context) {
			// A text never has more code points than UTF-16 units, so short ones need no counting
			return text == null
					|| text.length() <= max
					|| Character.codePointCount(text, 0, text.length()) <= max;
		}
	}
}
