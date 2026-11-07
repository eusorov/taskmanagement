package de.usorov.taskmanagement.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class TaskNamesTest {

	@ParameterizedTest
	@CsvSource(
			delimiter = '|',
			value = {
				"'  Buy milk  '        | Buy milk",
				"' Buy milk '  | Buy milk",
				"'​﻿Buy milk　' | Buy milk",
				"'\t\nBuy milk\r\n'     | Buy milk",
			})
	void stripsInvisibleCharactersFromBothEnds(String name, String expected) {
		assertThat(TaskNames.strip(name)).isEqualTo(expected);
	}

	@Test
	void keepsInvisibleCharactersInside() {
		assertThat(TaskNames.strip("Buy milk\nand​bread")).isEqualTo("Buy milk\nand​bread");
	}

	@Test
	void stripsInvisibleCharactersOutsideTheBasicPlane() {
		// U+E0001 LANGUAGE TAG, a format character stored as a surrogate pair
		assertThat(TaskNames.strip("󠀁Buy milk󠀁")).isEqualTo("Buy milk");
	}

	@Test
	void stripsLongInnerWhitespaceInLinearTime() {
		// A regex like [ ]+$ retries every inner run of spaces, which took minutes for a request body of this size
		String name = "a" + " ".repeat(1_000_000) + "a";
		String stripped = assertTimeoutPreemptively(Duration.ofSeconds(1), () -> TaskNames.strip(name));
		assertThat(stripped).isEqualTo(name);
	}

	@Test
	void stripsAValidNameToSomethingNonEmpty() {
		String name = " ​ x 　";
		assertThat(name).matches(TaskNames.HAS_VISIBLE_CHARACTER);
		assertThat(TaskNames.strip(name)).isEqualTo("x");
	}
}
