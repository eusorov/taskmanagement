package de.usorov.taskmanagement.config;

import static de.usorov.taskmanagement.db.jooq.Tables.TASKS;
import static org.assertj.core.api.Assertions.assertThat;

import de.usorov.taskmanagement.TestcontainersConfiguration;
import de.usorov.taskmanagement.db.jooq.enums.TaskPriority;
import java.util.UUID;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;

class DemoTasksConfigurationTest {

	private static final ApplicationArguments NO_ARGS = new DefaultApplicationArguments();

	@Nested
	@SpringBootTest
	@Import(TestcontainersConfiguration.class)
	class Enabled {

		@Autowired
		DSLContext dsl;

		@Autowired
		ApplicationRunner demoTasks;

		@Test
		void seedsAnEmptyDatabaseOnceWithAMixOfTasks() throws Exception {
			dsl.deleteFrom(TASKS).execute();

			demoTasks.run(NO_ARGS);

			assertThat(dsl.fetchCount(TASKS)).isEqualTo(DemoTasksConfiguration.DEMO_TASKS.size()).isEqualTo(20);
			assertThat(dsl.selectDistinct(TASKS.PRIORITY).from(TASKS).fetch(TASKS.PRIORITY))
					.containsExactlyInAnyOrder(TaskPriority.LOW, TaskPriority.NORMAL, TaskPriority.URGENT);
			assertThat(dsl.fetchCount(TASKS, TASKS.DONE.isTrue())).isBetween(1, 19);

			// A restart against the same database adds nothing
			demoTasks.run(NO_ARGS);
			assertThat(dsl.fetchCount(TASKS)).isEqualTo(20);
		}

		@Test
		void leavesADatabaseWithTasksAlone() throws Exception {
			dsl.deleteFrom(TASKS).execute();
			dsl.insertInto(TASKS, TASKS.ID, TASKS.NAME).values(UUID.randomUUID(), "Mine").execute();

			demoTasks.run(NO_ARGS);

			assertThat(dsl.select(TASKS.NAME).from(TASKS).fetch(TASKS.NAME)).containsExactly("Mine");
		}
	}

	@Nested
	@SpringBootTest(properties = "app.demo-tasks.enabled=false")
	@Import(TestcontainersConfiguration.class)
	class Disabled {

		@Autowired
		DSLContext dsl;

		@Autowired
		ApplicationContext context;

		@Test
		void doesNotSeed() {
			assertThat(context.containsBean("demoTasks")).isFalse();
			assertThat(dsl.fetchCount(TASKS)).isZero();
		}
	}
}
