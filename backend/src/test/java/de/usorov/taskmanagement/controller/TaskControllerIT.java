package de.usorov.taskmanagement.controller;

import static de.usorov.taskmanagement.db.jooq.Tables.TASKS;
import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import de.usorov.taskmanagement.TestClock;
import de.usorov.taskmanagement.TestClockConfiguration;
import de.usorov.taskmanagement.TestcontainersConfiguration;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

/**
 * Exercises the API over real HTTP against a running server: what MockMvc can't see (Tomcat, JSON on the wire,
 * content negotiation, absolute Location URLs, concurrent requests). Behaviour details are covered by
 * {@link TaskControllerTest}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "management.server.port=0")
@Import({TestcontainersConfiguration.class, TestClockConfiguration.class})
class TaskControllerIT {

	private static final MediaType MERGE_PATCH = MediaType.parseMediaType("application/merge-patch+json");

	@LocalServerPort
	int port;

	@Autowired
	RestClient.Builder restClientBuilder;

	@Autowired
	DSLContext dsl;

	@Autowired
	TestClock clock;

	RestClient client;

	@BeforeEach
	void setUp() {
		dsl.deleteFrom(TASKS).execute();
		clock.set(TestClockConfiguration.START);
		client = restClientBuilder
				.baseUrl("http://localhost:" + port)
				// Assert on error responses instead of throwing
				.defaultStatusHandler(HttpStatusCode::isError, (request, response) -> {})
				.build();
	}

	@Test
	void taskLifecycleOverHttp() {
		ResponseEntity<JsonNode> created = post("{\"name\":\"Ship it\",\"priority\":\"URGENT\"}");
		assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
		URI location = created.getHeaders().getLocation();
		String id = created.getBody().get("id").asText();
		assertThat(location).hasToString("http://localhost:" + port + "/api/tasks/" + id);

		ResponseEntity<JsonNode> fetched = client.get().uri(location).retrieve().toEntity(JsonNode.class);
		assertThat(fetched.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(fetched.getBody()).isEqualTo(created.getBody());

		ResponseEntity<JsonNode> patched = patch(id, "{\"done\":true,\"version\":0}");
		assertThat(patched.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(patched.getBody().get("done").asBoolean()).isTrue();

		ResponseEntity<Void> deleted = client.delete().uri(location).retrieve().toBodilessEntity();
		assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

		ResponseEntity<JsonNode> gone = client.get().uri(location).retrieve().toEntity(JsonNode.class);
		assertProblem(gone, HttpStatus.NOT_FOUND);
	}

	@Test
	void jsonWireFormat() {
		ResponseEntity<JsonNode> created = post("{\"name\":\"Format\"}");

		assertThat(created.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
		JsonNode task = created.getBody();
		assertThat(task.get("id").isTextual()).isTrue();
		assertThat(task.get("priority").asText()).isEqualTo("NORMAL");
		// Instants are ISO-8601 strings in UTC, not epoch numbers
		assertThat(task.get("createdAt").isTextual()).isTrue();
		assertThat(task.get("createdAt").asText()).isEqualTo("2026-01-01T10:00:00Z");
		assertThat(task.get("version").isInt()).isTrue();
	}

	@Test
	void listAcceptsRepeatedAndCommaSeparatedPriorities() {
		post("{\"name\":\"low\",\"priority\":\"LOW\"}");
		post("{\"name\":\"normal\"}");
		post("{\"name\":\"urgent\",\"priority\":\"URGENT\"}");

		for (String query : List.of("priority=LOW&priority=URGENT", "priority=LOW,URGENT")) {
			JsonNode page = client.get()
					.uri("/api/tasks?" + query + "&sort=name")
					.retrieve()
					.body(JsonNode.class);
			assertThat(page.get("items").findValuesAsText("name")).as(query).containsExactly("low", "urgent");
			assertThat(page.get("total").asInt()).as(query).isEqualTo(2);
		}
	}

	@Test
	void malformedJsonIs400Problem() {
		assertProblem(post("{\"name\":"), HttpStatus.BAD_REQUEST);
	}

	@Test
	void unsupportedContentTypeIs415Problem() {
		ResponseEntity<JsonNode> response = client.post()
				.uri("/api/tasks")
				.contentType(MediaType.TEXT_PLAIN)
				.body("Buy milk")
				.retrieve()
				.toEntity(JsonNode.class);

		assertProblem(response, HttpStatus.UNSUPPORTED_MEDIA_TYPE);
	}

	@Test
	void unsupportedMethodIs405ProblemWithAllowHeader() {
		ResponseEntity<JsonNode> response = client.put()
				.uri("/api/tasks/{id}", UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.body("{}")
				.retrieve()
				.toEntity(JsonNode.class);

		assertProblem(response, HttpStatus.METHOD_NOT_ALLOWED);
		assertThat(response.getHeaders().getAllow())
				.extracting(Object::toString)
				.contains("GET", "PATCH", "DELETE");
	}

	@Test
	void invalidTaskIdIs400Problem() {
		ResponseEntity<JsonNode> response =
				client.get().uri("/api/tasks/not-a-uuid").retrieve().toEntity(JsonNode.class);

		assertProblem(response, HttpStatus.BAD_REQUEST);
	}

	@Test
	void unknownPathIs404Problem() {
		assertProblem(client.get().uri("/api/nope").retrieve().toEntity(JsonNode.class), HttpStatus.NOT_FOUND);
	}

	@Test
	void concurrentUpdatesWithSameVersionLetExactlyOneWin() throws Exception {
		String id = post("{\"name\":\"Contended\"}").getBody().get("id").asText();
		int clients = 8;

		List<Callable<HttpStatusCode>> updates = new ArrayList<>();
		for (int i = 0; i < clients; i++) {
			String body = "{\"name\":\"writer " + i + "\",\"version\":0}";
			updates.add(() -> patch(id, body).getStatusCode());
		}
		List<HttpStatusCode> statuses = new ArrayList<>();
		ExecutorService executor = Executors.newFixedThreadPool(clients);
		try {
			for (Future<HttpStatusCode> result : executor.invokeAll(updates)) {
				statuses.add(result.get());
			}
		} finally {
			executor.shutdown();
		}

		assertThat(statuses).filteredOn(HttpStatus.OK::equals).hasSize(1);
		assertThat(statuses).filteredOn(HttpStatus.CONFLICT::equals).hasSize(clients - 1);
		JsonNode task = client.get().uri("/api/tasks/{id}", id).retrieve().body(JsonNode.class);
		assertThat(task.get("version").asInt()).isEqualTo(1);
	}

	// The headers nginx sends (frontend/nginx.conf): the browser's Host with its port, and the scheme it used
	@Test
	void locationUsesTheAddressTheBrowserCalled() {
		ResponseEntity<JsonNode> overHttp = postVia("http", "tasks.example:8081");
		assertThat(overHttp.getHeaders().getLocation())
				.hasToString("http://tasks.example:8081/api/tasks/" + overHttp.getBody().get("id").asText());

		ResponseEntity<JsonNode> overHttps = postVia("https", "tasks.example");
		assertThat(overHttps.getHeaders().getLocation())
				.hasToString("https://tasks.example/api/tasks/" + overHttps.getBody().get("id").asText());
	}

	private ResponseEntity<JsonNode> post(String json) {
		return client.post()
				.uri("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.body(json)
				.retrieve()
				.toEntity(JsonNode.class);
	}

	private ResponseEntity<JsonNode> postVia(String proto, String host) {
		return client.post()
				.uri("/api/tasks")
				.header("X-Forwarded-Proto", proto)
				.header("X-Forwarded-Host", host)
				.contentType(MediaType.APPLICATION_JSON)
				.body("{\"name\":\"Ship it\"}")
				.retrieve()
				.toEntity(JsonNode.class);
	}

	private ResponseEntity<JsonNode> patch(String id, String json) {
		return client.patch()
				.uri("/api/tasks/{id}", id)
				.contentType(MERGE_PATCH)
				.body(json)
				.retrieve()
				.toEntity(JsonNode.class);
	}

	private static void assertProblem(ResponseEntity<JsonNode> response, HttpStatus status) {
		assertThat(response.getStatusCode()).isEqualTo(status);
		assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
		assertThat(response.getBody().get("status").asInt()).isEqualTo(status.value());
		assertThat(response.getBody().get("title").asText()).isNotBlank();
	}
}
