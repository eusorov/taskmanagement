package de.usorov.taskmanagement;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OpenApiTest {

	@Autowired
	MockMvc mvc;

	@Test
	void specDescribesTaskEndpoints() throws Exception {
		mvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paths['/api/tasks'].get.parameters[*].name")
						.value(contains("done", "priority", "q", "sort", "order", "groupDone", "page", "size")))
				.andExpect(jsonPath("$.paths['/api/tasks'].post").exists())
				.andExpect(jsonPath("$.paths['/api/tasks/{id}'].patch").exists())
				.andExpect(jsonPath("$.paths['/api/tasks/{id}'].delete").exists())
				.andExpect(jsonPath("$.components.schemas.TaskResponse").exists());
	}

	@Test
	void specDocumentsStatusCodesAndProblemResponses() throws Exception {
		String problem = "$.components.schemas.Problem";
		String problemRef = "#/components/schemas/Problem";
		String json = "application/problem+json";
		mvc.perform(get("/v3/api-docs"))
				.andExpect(jsonPath("$.paths['/api/tasks'].get.responses.keys()").value(containsInAnyOrder("200", "400")))
				.andExpect(jsonPath("$.paths['/api/tasks'].post.responses.keys()").value(containsInAnyOrder("201", "400", "409")))
				.andExpect(jsonPath("$.paths['/api/tasks'].post.responses['201'].headers.Location").exists())
				.andExpect(jsonPath("$.paths['/api/tasks/{id}'].get.responses.keys()")
						.value(containsInAnyOrder("200", "400", "404")))
				.andExpect(jsonPath("$.paths['/api/tasks/{id}'].patch.responses.keys()")
						.value(containsInAnyOrder("200", "400", "404", "409")))
				.andExpect(jsonPath("$.paths['/api/tasks/{id}'].delete.responses.keys()")
						.value(containsInAnyOrder("204", "400", "404")))
				.andExpect(jsonPath("$.paths['/api/tasks/{id}'].patch.responses['409'].content['" + json + "'].schema.$ref")
						.value(problemRef))
				.andExpect(jsonPath("$.paths['/api/tasks'].get.responses['200'].content['application/json'].schema.$ref")
						.value("#/components/schemas/TaskPageResponse"))
				.andExpect(jsonPath(problem + ".properties.keys()")
						.value(containsInAnyOrder("type", "title", "status", "detail", "instance", "violations")));
	}

	@Test
	void problemSchemaMatchesActualErrorBody() throws Exception {
		mvc.perform(get("/api/tasks").param("size", "0"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.type").value("about:blank"))
				.andExpect(jsonPath("$.title").value("Bad Request"))
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.detail").exists())
				.andExpect(jsonPath("$.instance").value("/api/tasks"))
				.andExpect(jsonPath("$.violations[0].field").value("size"))
				.andExpect(jsonPath("$.violations[0].message").exists());
	}
}
