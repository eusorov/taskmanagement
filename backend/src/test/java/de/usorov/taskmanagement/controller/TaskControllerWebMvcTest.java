package de.usorov.taskmanagement.controller;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.Task;
import de.usorov.taskmanagement.model.TaskChanges;
import de.usorov.taskmanagement.model.TaskPage;
import de.usorov.taskmanagement.model.TaskSearch;
import de.usorov.taskmanagement.model.TaskSortField;
import de.usorov.taskmanagement.service.TaskLimitReachedException;
import de.usorov.taskmanagement.service.TaskNotFoundException;
import de.usorov.taskmanagement.service.TaskService;
import de.usorov.taskmanagement.service.VersionConflictException;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Web layer only, with {@link TaskService} mocked: request → service call, validation, exception → status,
 * model → JSON. Fast and without a database; end-to-end behaviour is covered by {@link TaskControllerTest}.
 */
@WebMvcTest(TaskController.class)
class TaskControllerWebMvcTest {

	private static final UUID ID = UUID.fromString("0b9f2d1e-6a43-4c1e-9d6e-2f4b8a1c7e55");
	private static final Instant CREATED = Instant.parse("2026-01-01T10:00:00Z");
	private static final Instant UPDATED = Instant.parse("2026-01-01T10:05:00Z");
	private static final Task TASK = new Task(ID, "Buy milk", Priority.URGENT, false, CREATED, UPDATED, 3);

	@Autowired
	MockMvc mvc;

	@MockitoBean
	TaskService taskService;

	@Test
	void listWithoutParametersUsesDefaults() throws Exception {
		when(taskService.find(any())).thenReturn(new TaskPage(List.of(TASK), 0, 50, 1));

		mvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].id").value(ID.toString()))
				.andExpect(jsonPath("$.page").value(0))
				.andExpect(jsonPath("$.size").value(50))
				.andExpect(jsonPath("$.total").value(1));

		verify(taskService).find(new TaskSearch(null, EnumSet.noneOf(Priority.class), null, null, false, true, 0, 50));
	}

	@Test
	void listMapsQueryParametersToSearch() throws Exception {
		when(taskService.find(any())).thenReturn(new TaskPage(List.of(), 2, 10, 0));

		mvc.perform(get("/api/tasks")
						.param("done", "false")
						.param("priority", "URGENT,LOW")
						.param("q", "  milk  ")
						.param("sort", "updatedAt")
						.param("order", "asc")
						.param("groupDone", "false")
						.param("page", "2")
						.param("size", "10"))
				.andExpect(status().isOk());

		verify(taskService)
				.find(new TaskSearch(
						false,
						EnumSet.of(Priority.URGENT, Priority.LOW),
						"milk",
						TaskSortField.UPDATED_AT,
						true,
						false,
						2,
						10));
	}

	@ParameterizedTest
	@ValueSource(strings = {"URGENT,", ",URGENT", "URGENT,,", " ,URGENT"})
	void listIgnoresEmptyPriorityEntries(String priority) throws Exception {
		when(taskService.find(any())).thenReturn(new TaskPage(List.of(), 0, 50, 0));

		mvc.perform(get("/api/tasks").param("priority", priority)).andExpect(status().isOk());

		verify(taskService)
				.find(new TaskSearch(null, EnumSet.of(Priority.URGENT), null, null, false, true, 0, 50));
	}

	@ParameterizedTest
	@ValueSource(strings = {"", ",", ",,"})
	void listTreatsOnlyEmptyPriorityEntriesAsNoFilter(String priority) throws Exception {
		when(taskService.find(any())).thenReturn(new TaskPage(List.of(), 0, 50, 0));

		mvc.perform(get("/api/tasks").param("priority", priority)).andExpect(status().isOk());

		verify(taskService)
				.find(new TaskSearch(null, EnumSet.noneOf(Priority.class), null, null, false, true, 0, 50));
	}

	@Test
	void listSortsByNameAscendingByDefault() throws Exception {
		when(taskService.find(any())).thenReturn(new TaskPage(List.of(), 0, 50, 0));

		mvc.perform(get("/api/tasks").param("sort", "name")).andExpect(status().isOk());

		verify(taskService)
				.find(new TaskSearch(
						null, EnumSet.noneOf(Priority.class), null, TaskSortField.NAME, true, true, 0, 50));
	}

	@Test
	void listRejectsInvalidParametersWithoutCallingService() throws Exception {
		mvc.perform(get("/api/tasks").param("size", "201").param("order", "sideways"))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.violations[*].field").value(containsInAnyOrder("size", "order")));

		verifyNoInteractions(taskService);
	}

	@Test
	void listRejectsNulCharacterInSearchWithoutCallingService() throws Exception {
		mvc.perform(get("/api/tasks").param("q", "a\u0000b"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("q"))
				.andExpect(jsonPath("$.violations[0].message").value("must not contain NUL characters"));

		verifyNoInteractions(taskService);
	}

	@Test
	void getReturnsTaskAsJson() throws Exception {
		when(taskService.get(ID)).thenReturn(TASK);

		mvc.perform(get("/api/tasks/{id}", ID))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(jsonPath("$.id").value(ID.toString()))
				.andExpect(jsonPath("$.name").value("Buy milk"))
				.andExpect(jsonPath("$.priority").value("URGENT"))
				.andExpect(jsonPath("$.done").value(false))
				.andExpect(jsonPath("$.createdAt").value("2026-01-01T10:00:00Z"))
				.andExpect(jsonPath("$.updatedAt").value("2026-01-01T10:05:00Z"))
				.andExpect(jsonPath("$.version").value(3));
	}

	@Test
	void getMapsTaskNotFoundTo404() throws Exception {
		when(taskService.get(ID)).thenThrow(new TaskNotFoundException(ID));

		mvc.perform(get("/api/tasks/{id}", ID))
				.andExpect(status().isNotFound())
				.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.detail").value("Task " + ID + " not found"));
	}

	@Test
	void getRejectsInvalidIdWithoutCallingService() throws Exception {
		mvc.perform(get("/api/tasks/not-a-uuid")).andExpect(status().isBadRequest());

		verifyNoInteractions(taskService);
	}

	@Test
	void createPassesNameAndPriorityAndReturnsLocation() throws Exception {
		when(taskService.create("Buy milk", Priority.URGENT)).thenReturn(TASK);

		mvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"Buy milk\",\"priority\":\"URGENT\"}"))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "http://localhost/api/tasks/" + ID))
				.andExpect(jsonPath("$.id").value(ID.toString()));
	}

	@Test
	void createPassesMissingPriorityAsNull() throws Exception {
		when(taskService.create("Buy milk", null)).thenReturn(TASK);

		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Buy milk\"}"))
				.andExpect(status().isCreated());

		verify(taskService).create("Buy milk", null);
	}

	@Test
	void createRejectsInvalidBodyWithoutCallingService() throws Exception {
		mvc.perform(post("/api/tasks")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"" + "x".repeat(501) + "\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("name"));

		verifyNoInteractions(taskService);
	}

	@Test
	void createRejectsNulCharacterWithoutCallingService() throws Exception {
		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"a\\u0000b\"}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("name"))
				.andExpect(jsonPath("$.violations[0].message").value("must not contain NUL characters"));

		verifyNoInteractions(taskService);
	}

	@Test
	void createMapsTaskLimitTo409() throws Exception {
		when(taskService.create(any(), any())).thenThrow(new TaskLimitReachedException(10_000));

		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"one more\"}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Task limit of 10000 reached"));
	}

	@Test
	void patchPassesVersionAndOnlyGivenFields() throws Exception {
		when(taskService.update(eq(ID), eq(3), any())).thenReturn(TASK);

		mvc.perform(patch("/api/tasks/{id}", ID)
						.contentType("application/merge-patch+json")
						.content("{\"done\":true,\"version\":3}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(ID.toString()));

		verify(taskService).update(ID, 3, new TaskChanges(null, null, true));
	}

	@Test
	void patchMapsVersionConflictTo409() throws Exception {
		when(taskService.update(eq(ID), eq(2), any())).thenThrow(new VersionConflictException(ID, 2));

		mvc.perform(patch("/api/tasks/{id}", ID)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"New\",\"version\":2}"))
				.andExpect(status().isConflict())
				.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON));
	}

	@Test
	void patchRejectsBlankNameWithoutCallingService() throws Exception {
		mvc.perform(patch("/api/tasks/{id}", ID)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"  \",\"version\":0}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("name"))
				.andExpect(jsonPath("$.violations[0].message").value("must not be blank"));

		verifyNoInteractions(taskService);
	}

	@Test
	void patchRejectsNulCharacterWithoutCallingService() throws Exception {
		mvc.perform(patch("/api/tasks/{id}", ID)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"a\\u0000b\",\"version\":0}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("name"))
				.andExpect(jsonPath("$.violations[0].message").value("must not contain NUL characters"));

		verifyNoInteractions(taskService);
	}

	@Test
	void patchAcceptsNameWithLineBreak() throws Exception {
		when(taskService.update(eq(ID), eq(0), any())).thenReturn(TASK);

		mvc.perform(patch("/api/tasks/{id}", ID)
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"name\":\"two\\nlines\",\"version\":0}"))
				.andExpect(status().isOk());

		verify(taskService).update(ID, 0, new TaskChanges("two\nlines", null, null));
	}

	@Test
	void createRejectsMissingNameAsBlank() throws Exception {
		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.violations[0].field").value("name"))
				.andExpect(jsonPath("$.violations[0].message").value("must not be blank"));

		verifyNoInteractions(taskService);
	}

	@Test
	void nameMayContainTabsAndNewlines() throws Exception {
		when(taskService.create("a\tb\nc", null)).thenReturn(TASK);

		mvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"a\\tb\\nc\"}"))
				.andExpect(status().isCreated());
	}

	@Test
	void deleteReturns204() throws Exception {
		mvc.perform(delete("/api/tasks/{id}", ID)).andExpect(status().isNoContent());

		verify(taskService).delete(ID);
	}

	@Test
	void deleteMapsTaskNotFoundTo404() throws Exception {
		doThrow(new TaskNotFoundException(ID)).when(taskService).delete(ID);

		mvc.perform(delete("/api/tasks/{id}", ID)).andExpect(status().isNotFound());
	}
}
