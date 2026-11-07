package de.usorov.taskmanagement.config;

import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.Task;
import de.usorov.taskmanagement.repository.TaskRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Adds sample tasks on startup when the database is empty, so a fresh setup has something to show. Only with
 * {@code app.demo-tasks.enabled=true}, which the {@code dev} profile sets.
 */
@Slf4j
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "app.demo-tasks.enabled", havingValue = "true")
class DemoTasksConfiguration {

	// Arbitrary key for pg_advisory_xact_lock, so replicas starting together seed only once
	private static final long SEED_LOCK = 0x7461736b73L;

	record DemoTask(String name, Priority priority, boolean done) {}

	static final List<DemoTask> DEMO_TASKS = List.of(
			new DemoTask("Renew passport before the summer trip", Priority.URGENT, false),
			new DemoTask("Pay the electricity bill", Priority.URGENT, false),
			new DemoTask("Book a dentist appointment", Priority.NORMAL, false),
			new DemoTask("Call mom on Sunday", Priority.NORMAL, false),
			new DemoTask("Buy milk, eggs and bread", Priority.NORMAL, true),
			new DemoTask("Fix the dripping kitchen tap", Priority.LOW, false),
			new DemoTask("Back up the laptop", Priority.NORMAL, false),
			new DemoTask("Return the library books", Priority.LOW, true),
			new DemoTask("Prepare slides for Monday's meeting", Priority.URGENT, false),
			new DemoTask("Reply to the landlord about the heating", Priority.NORMAL, true),
			new DemoTask("Water the plants", Priority.LOW, false),
			new DemoTask("Cancel the unused streaming subscription", Priority.LOW, false),
			new DemoTask("Submit the expense report", Priority.URGENT, true),
			new DemoTask("Pick up the dry cleaning", Priority.LOW, false),
			new DemoTask("Schedule the car service", Priority.NORMAL, false),
			new DemoTask("Send a birthday card to Anna", Priority.NORMAL, false),
			new DemoTask("Sort the photos from the holiday", Priority.LOW, false),
			new DemoTask("Update the CV", Priority.NORMAL, false),
			new DemoTask("Clean out the fridge", Priority.LOW, true),
			new DemoTask("File the tax return", Priority.URGENT, false));

	@Bean
	ApplicationRunner demoTasks(
			DSLContext dsl, TaskRepository taskRepository, Clock clock, TransactionTemplate transactionTemplate) {
		return args -> transactionTemplate.executeWithoutResult(status -> {
			dsl.fetch("select pg_advisory_xact_lock({0})", DSL.val(SEED_LOCK));
			if (taskRepository.count() > 0) {
				return;
			}
			Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
			for (int i = 0; i < DEMO_TASKS.size(); i++) {
				DemoTask demo = DEMO_TASKS.get(i);
				// Spread creation over the last days, oldest first
				Instant created = now.minus((long) (DEMO_TASKS.size() - i) * 3, ChronoUnit.HOURS);
				taskRepository.insert(
						new Task(UUID.randomUUID(), demo.name(), demo.priority(), demo.done(), created, created, 0));
			}
			log.info("Added {} demo tasks to the empty database", DEMO_TASKS.size());
		});
	}
}
