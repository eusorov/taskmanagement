package de.usorov.taskmanagement.controller;

import static de.usorov.taskmanagement.db.jooq.Tables.TASKS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.usorov.taskmanagement.TestClock;
import de.usorov.taskmanagement.TestClockConfiguration;
import de.usorov.taskmanagement.TestcontainersConfiguration;
import java.time.Duration;
import java.util.UUID;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import({TestcontainersConfiguration.class, TestClockConfiguration.class})
@ExtendWith(OutputCaptureExtension.class)
class TaskControllerTest {

	@Autowired
	MockMvc mvc;

	@Autowired
	ObjectMapper objectMapper;

	@Autowired
	DSLContext dsl;

	@Autowired
	TestClock clock;

	@BeforeEach
	void setUp() {
		dsl.deleteFrom(TASKS).execute();
		clock.set(TestClockConfiguration.START);
	}

	@Test
	void createReturnsTaskWithDefaultsAndLocation() throws Exception {
		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  Buy milk  \"}"))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", matchesPattern(".*/api/tasks/[0-9a-f-]{36}")))
				.andExpect(jsonPath("$.name").value("Buy milk"))
				.andExpect(jsonPath("$.priority").value("NORMAL"))
				.andExpect(jsonPath("$.done").value(false))
				.andExpect(jsonPath("$.version").value(0))
				.andExpect(jsonPath("$.createdAt").value("2026-01-01T10:00:00Z"));
	}

	@Test
	void changesAreLoggedWithoutTaskNames(CapturedOutput output) throws Exception {
		String id = create("{\"name\":\"secret plan\"}").get("id").asText();
		patchTask(id, "{\"done\":true,\"version\":0}");
		mvc.perform(delete("/api/tasks/{id}", id)).andExpect(status().isNoContent());

		assertThat(output)
				.contains("Created task " + id + " with priority NORMAL")
				.contains("Updated task " + id + " to version 1")
				.contains("Deleted task " + id)
				.doesNotContain("secret plan");
	}

	@Test
	void createStripsUnicodeSpacesAndRejectsInvisibleNames() throws Exception {
		mvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"\\u00a0\\u200bBuy milk\\u3000\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("Buy milk"));

		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\\u00a0\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].message").value("must not be blank"));
	}

	@Test
	void createCanAddATaskThatIsAlreadyDone() throws Exception {
		mvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Already handled\",\"done\":true}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.done").value(true));
		create("{\"name\":\"Still open\",\"done\":false}");

		mvc.perform(get("/api/tasks").param("done", "true"))
				.andExpect(jsonPath("$.items[*].name").value(contains("Already handled")));
	}

	@Test
	void createRejectsBlankName() throws Exception {
		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"   \"}"))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.violations[0].field").value("name"));
	}

	// The validation limit and the database's char_length check count the same way: 500 emoji are stored, 501 rejected
	@Test
	void createAcceptsUpTo500EmojiAsTheDatabaseDoes() throws Exception {
		mvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"" + "😀".repeat(500) + "\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("😀".repeat(500)));

		mvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"" + "😀".repeat(501) + "\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].message").value("must be at most 500 characters"));
	}

	@Test
	void createRejectsUnknownPriority() throws Exception {
		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"x\",\"priority\":\"HIGH\"}"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void createFailsWhenTaskLimitReached() throws Exception {
		dsl.execute("insert into tasks (id, name) select gen_random_uuid(), 'task' from generate_series(1, 10000)");

		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"one more\"}"))
				.andExpect(status().isConflict());
	}

	@Test
	void getReturnsTask() throws Exception {
		JsonNode task = create("{\"name\":\"Read\",\"priority\":\"URGENT\"}");

		mvc.perform(get("/api/tasks/{id}", task.get("id").asText()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Read"))
				.andExpect(jsonPath("$.priority").value("URGENT"));
	}

	@Test
	void getUnknownTaskIs404() throws Exception {
		mvc.perform(get("/api/tasks/{id}", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON));
	}

	@Test
	void patchChangesOnlyGivenFieldsAndBumpsVersion() throws Exception {
		JsonNode task = create("{\"name\":\"Write\",\"priority\":\"LOW\"}");
		clock.advance(Duration.ofMinutes(5));

		mvc.perform(patch("/api/tasks/{id}", task.get("id").asText())
						.contentType("application/merge-patch+json")
						.content("{\"done\":true,\"version\":0}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Write"))
				.andExpect(jsonPath("$.priority").value("LOW"))
				.andExpect(jsonPath("$.done").value(true))
				.andExpect(jsonPath("$.version").value(1))
				.andExpect(jsonPath("$.createdAt").value("2026-01-01T10:00:00Z"))
				.andExpect(jsonPath("$.updatedAt").value("2026-01-01T10:05:00Z"));
	}

	@ParameterizedTest
	@ValueSource(
			strings = {
				"{\"version\":0}",
				// Same values as the task already has
				"{\"name\":\"Write\",\"priority\":\"LOW\",\"done\":false,\"version\":0}"
			})
	void patchThatChangesNothingKeepsVersionAndUpdatedAt(String json) throws Exception {
		JsonNode task = create("{\"name\":\"Write\",\"priority\":\"LOW\"}");
		clock.advance(Duration.ofMinutes(5));

		mvc.perform(patch("/api/tasks/{id}", task.get("id").asText())
						.contentType(MediaType.APPLICATION_JSON)
						.content(json))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("Write"))
				.andExpect(jsonPath("$.version").value(0))
				.andExpect(jsonPath("$.updatedAt").value("2026-01-01T10:00:00Z"));
	}

	@Test
	void patchThatChangesOneOfSeveralFieldsBumpsVersion() throws Exception {
		JsonNode task = create("{\"name\":\"Write\",\"priority\":\"LOW\"}");

		mvc.perform(patch("/api/tasks/{id}", task.get("id").asText())
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Write\",\"priority\":\"URGENT\",\"version\":0}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.priority").value("URGENT"))
				.andExpect(jsonPath("$.version").value(1));
	}

	@Test
	void patchThatChangesNothingStillChecksVersion() throws Exception {
		JsonNode task = create("{\"name\":\"Write\"}");
		String id = task.get("id").asText();
		patchTask(id, "{\"name\":\"First\",\"version\":0}");

		mvc.perform(patch("/api/tasks/{id}", id).contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
				.andExpect(status().isConflict());
		mvc.perform(patch("/api/tasks/{id}", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
						.content("{\"version\":0}"))
				.andExpect(status().isNotFound());
	}

	@Test
	void patchWithStaleVersionIs409() throws Exception {
		JsonNode task = create("{\"name\":\"Write\"}");
		String id = task.get("id").asText();
		patchTask(id, "{\"name\":\"First\",\"version\":0}");

		mvc.perform(patch("/api/tasks/{id}", id).contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Second\",\"version\":0}"))
				.andExpect(status().isConflict());
	}

	@Test
	void patchUnknownTaskIs404() throws Exception {
		mvc.perform(patch("/api/tasks/{id}", UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
						.content("{\"done\":true,\"version\":0}"))
				.andExpect(status().isNotFound());
	}

	@Test
	void patchRequiresVersion() throws Exception {
		JsonNode task = create("{\"name\":\"Write\"}");

		mvc.perform(patch("/api/tasks/{id}", task.get("id").asText()).contentType(MediaType.APPLICATION_JSON)
						.content("{\"done\":true}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("version"));
	}

	@Test
	void deleteRemovesTask() throws Exception {
		String id = create("{\"name\":\"Gone soon\"}").get("id").asText();

		mvc.perform(delete("/api/tasks/{id}", id)).andExpect(status().isNoContent());
		mvc.perform(get("/api/tasks/{id}", id)).andExpect(status().isNotFound());
		mvc.perform(delete("/api/tasks/{id}", id)).andExpect(status().isNotFound());
	}

	@Test
	void listUsesDefaultOrderAndPaging() throws Exception {
		createAt("{\"name\":\"normal old\"}", 0);
		createAt("{\"name\":\"urgent\",\"priority\":\"URGENT\"}", 1);
		createAt("{\"name\":\"normal new\"}", 2);
		String doneId = createAt("{\"name\":\"urgent done\",\"priority\":\"URGENT\"}", 3)
				.get("id")
				.asText();
		patchTask(doneId, "{\"done\":true,\"version\":0}");

		mvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[*].name").value(contains("urgent", "normal new", "normal old", "urgent done")))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(50))
				.andExpect(jsonPath("$.total").value(4));

		mvc.perform(get("/api/tasks").param("page", "1").param("size", "3"))
				.andExpect(jsonPath("$.items[*].name").value(contains("urgent done")))
				.andExpect(jsonPath("$.total").value(4));

		// Same as the default
		mvc.perform(get("/api/tasks").param("sort", "priority"))
				.andExpect(jsonPath("$.items[*].name").value(contains("urgent", "normal new", "normal old", "urgent done")));
		// Lowest priority first, still newest first within a priority
		mvc.perform(get("/api/tasks").param("order", "asc"))
				.andExpect(jsonPath("$.items[*].name").value(contains("normal new", "normal old", "urgent", "urgent done")));
	}

	@Test
	void listSortsByRequestedField() throws Exception {
		createAt("{\"name\":\"b\"}", 0);
		String doneId = createAt("{\"name\":\"a\"}", 1).get("id").asText();
		createAt("{\"name\":\"c\"}", 2);
		patchTask(doneId, "{\"done\":true,\"version\":0}");

		mvc.perform(get("/api/tasks").param("sort", "name"))
				.andExpect(jsonPath("$.items[*].name").value(contains("b", "c", "a")));
		mvc.perform(get("/api/tasks").param("sort", "name").param("groupDone", "false"))
				.andExpect(jsonPath("$.items[*].name").value(contains("a", "b", "c")));
		mvc.perform(get("/api/tasks").param("sort", "name").param("order", "desc").param("groupDone", "false"))
				.andExpect(jsonPath("$.items[*].name").value(contains("c", "b", "a")));
	}

	@Test
	void listFilters() throws Exception {
		create("{\"name\":\"Buy MILK\",\"priority\":\"URGENT\"}");
		create("{\"name\":\"buy bread\",\"priority\":\"LOW\"}");
		create("{\"name\":\"100% done\"}");
		String doneId = create("{\"name\":\"call mom\"}").get("id").asText();
		patchTask(doneId, "{\"done\":true,\"version\":0}");

		mvc.perform(get("/api/tasks").param("q", "milk"))
				.andExpect(jsonPath("$.items[*].name").value(contains("Buy MILK")));
		mvc.perform(get("/api/tasks").param("q", "%"))
				.andExpect(jsonPath("$.items[*].name").value(contains("100% done")));
		mvc.perform(get("/api/tasks").param("priority", "URGENT,LOW").param("sort", "name"))
				.andExpect(jsonPath("$.items[*].name").value(contains("buy bread", "Buy MILK")));
		mvc.perform(get("/api/tasks").param("done", "true"))
				.andExpect(jsonPath("$.items[*].name").value(contains("call mom")));
	}

	@Test
	void listRejectsInvalidParameters() throws Exception {
		mvc.perform(get("/api/tasks").param("size", "201"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("size"));
		mvc.perform(get("/api/tasks").param("sort", "owner")).andExpect(status().isBadRequest());
		mvc.perform(get("/api/tasks").param("priority", "HIGH"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].message").value("invalid value"));
	}

	private JsonNode create(String json) throws Exception {
		String body = mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content(json))
				.andExpect(status().isCreated())
				.andReturn()
				.getResponse()
				.getContentAsString();
		return objectMapper.readTree(body);
	}

	private JsonNode createAt(String json, int minutesAfterStart) throws Exception {
		clock.set(TestClockConfiguration.START.plus(Duration.ofMinutes(minutesAfterStart)));
		return create(json);
	}

	private void patchTask(String id, String json) throws Exception {
		mvc.perform(patch("/api/tasks/{id}", id).contentType(MediaType.APPLICATION_JSON).content(json))
				.andExpect(status().isOk());
	}
}
