package de.usorov.taskmanagement.model;

import static org.assertj.core.api.Assertions.assertThat;

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
	void stripsAValidNameToSomethingNonEmpty() {
		String name = " ​ x 　";
		assertThat(name).matches(TaskNames.HAS_VISIBLE_CHARACTER);
		assertThat(TaskNames.strip(name)).isEqualTo("x");
	}
}
