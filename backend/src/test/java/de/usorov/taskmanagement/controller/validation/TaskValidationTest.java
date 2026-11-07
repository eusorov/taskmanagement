package de.usorov.taskmanagement.controller.validation;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class TaskValidationTest {

	record Named(@TaskName String name) {}

	record Searched(@NoNulCharacters String query) {}

	ValidatorFactory factory;
	Validator validator;

	@BeforeAll
	void setUp() {
		factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	@AfterAll
	void tearDown() {
		factory.close();
	}

	private List<String> messages(Object bean) {
		return validator.validate(bean).stream().map(ConstraintViolation::getMessage).sorted().toList();
	}

	@Nested
	class TaskNameRules {

		@ParameterizedTest
		@ValueSource(
				strings = {
					"Buy milk", "a", "  padded  ", "two\nlines", "tab\tinside", "😀",
					// Invisible characters are fine next to visible ones
					"\u00a0Buy\u00a0milk\u00a0", "a\u200bb", "👨\u200d👩\u200d👧"
				})
		void acceptsNames(String name) {
			assertThat(messages(new Named(name))).isEmpty();
		}

		@Test
		void acceptsNullSoUpdatesCanLeaveTheNameOut() {
			assertThat(messages(new Named(null))).isEmpty();
		}

		@Test
		void acceptsExactly500Characters() {
			assertThat(messages(new Named("x".repeat(500)))).isEmpty();
		}

		@ParameterizedTest
		@ValueSource(
				strings = {
					"", " ", "   ", "\n", " \t\n ",
					"\u00a0", // no-break space
					"\u2007\u202f", // figure space, narrow no-break space
					"\u3000", // ideographic space
					"\u2028\u2029", // line and paragraph separators
					"\u200b", // zero-width space
					"\ufeff", // byte order mark
					"\u0001\u001f", // control characters
					" \u00a0\t\u200b "
				})
		void rejectsBlankNames(String name) {
			assertThat(messages(new Named(name))).containsExactly("must not be blank");
		}

		@Test
		void rejectsMoreThan500Characters() {
			assertThat(messages(new Named("x".repeat(501)))).containsExactly("must be at most 500 characters");
		}

		// Counted like Postgres char_length: an emoji is one character, though Java stores it as two chars
		@Test
		void countsCharactersOutsideTheBasicPlaneOnce() {
			assertThat(messages(new Named("😀".repeat(500)))).isEmpty();
			assertThat(messages(new Named("😀".repeat(501)))).containsExactly("must be at most 500 characters");
		}

		@Test
		void rejectsNulCharacters() {
			assertThat(messages(new Named("a\u0000b"))).containsExactly("must not contain NUL characters");
		}

		@Test
		void reportsEveryBrokenRule() {
			// NUL is invisible too, so a name of only NULs is also blank
			assertThat(messages(new Named("\u0000".repeat(501))))
					.containsExactly(
							"must be at most 500 characters", "must not be blank", "must not contain NUL characters");
		}
	}

	@Nested
	class NoNulCharactersRule {

		@ParameterizedTest
		@ValueSource(strings = {"", "milk", "100% done", "line\nbreak"})
		void acceptsTextWithoutNul(String text) {
			assertThat(messages(new Searched(text))).isEmpty();
		}

		@Test
		void acceptsNull() {
			assertThat(messages(new Searched(null))).isEmpty();
		}

		@ParameterizedTest
		@ValueSource(strings = {"\u0000", "a\u0000", "\u0000b", "line\n\u0000"})
		void rejectsNulAnywhere(String text) {
			assertThat(messages(new Searched(text))).containsExactly("must not contain NUL characters");
		}
	}
}
