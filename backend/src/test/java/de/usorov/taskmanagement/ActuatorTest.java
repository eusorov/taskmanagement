package de.usorov.taskmanagement;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalManagementPort;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "management.server.port=0")
@Import(TestcontainersConfiguration.class)
class ActuatorTest {

	@LocalServerPort
	int serverPort;

	@LocalManagementPort
	int managementPort;

	@Autowired
	TestRestTemplate rest;

	@Test
	void livenessIsUp() {
		ResponseEntity<String> response = get(managementPort, "/actuator/health/liveness");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody()).contains("\"status\":\"UP\"");
	}

	@Test
	void readinessIncludesDatabase() {
		ResponseEntity<String> response = get(managementPort, "/actuator/health/readiness");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody()).contains("\"db\":{\"status\":\"UP\"");
	}

	@Test
	void actuatorIsNotOnTheApiPort() {
		assertThat(get(serverPort, "/actuator/health").getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	private ResponseEntity<String> get(int port, String path) {
		return rest.getForEntity("http://localhost:" + port + path, String.class);
	}
}
