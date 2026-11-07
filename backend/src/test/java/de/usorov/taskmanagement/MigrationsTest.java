package de.usorov.taskmanagement;

import static de.usorov.taskmanagement.db.jooq.Tables.TASKS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import de.usorov.taskmanagement.db.jooq.enums.TaskPriority;
import java.util.UUID;
import org.jooq.DSLContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jooq.JooqTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

@JooqTest
@Import(TestcontainersConfiguration.class)
class MigrationsTest {

	@Autowired
	DSLContext dsl;

	@Test
	void taskNameMustBeBetween1And500Characters() {
		assertThatThrownBy(() -> inSavepoint(() -> insertTask(""))).isInstanceOf(DataIntegrityViolationException.class);
		assertThatThrownBy(() -> inSavepoint(() -> insertTask("x".repeat(501))))
				.isInstanceOf(DataIntegrityViolationException.class);
		insertTask("x".repeat(500));
	}

	@Test
	void taskDefaults() {
		UUID id = insertTask("Buy milk");

		var task = dsl.selectFrom(TASKS).where(TASKS.ID.eq(id)).fetchOne();
		assertThat(task.getPriority()).isEqualTo(TaskPriority.NORMAL);
		assertThat(task.getDone()).isFalse();
		assertThat(task.getVersion()).isZero();
	}

	@Test
	void prioritySortsInDeclarationOrder() {
		for (TaskPriority priority : new TaskPriority[] {TaskPriority.NORMAL, TaskPriority.URGENT, TaskPriority.LOW}) {
			dsl.insertInto(TASKS, TASKS.ID, TASKS.NAME, TASKS.PRIORITY)
					.values(UUID.randomUUID(), priority.getLiteral(), priority)
					.execute();
		}

		assertThat(dsl.select(TASKS.PRIORITY).from(TASKS).orderBy(TASKS.PRIORITY).fetch(TASKS.PRIORITY))
				.containsExactly(TaskPriority.LOW, TaskPriority.NORMAL, TaskPriority.URGENT);
	}

	// Every order the UI offers (TaskRepository.orderFor) comes straight from an index, without sorting the table
	@ParameterizedTest
	@CsvSource(
			delimiter = '|',
			value = {
				"done, priority desc, created_at desc, id | tasks_list_order_idx", // Priority, the default
				"done, created_at desc, id | tasks_created_at_desc_idx", // Newest first
				"done, created_at, id | tasks_created_at_asc_idx", // Oldest first
				"done, updated_at desc, id | tasks_updated_at_desc_idx", // Recently changed
				"done, name, id | tasks_name_asc_idx", // Name A–Z
				"done, name desc, id | tasks_name_desc_idx" // Name Z–A
			})
	void listOrdersAreReadFromAnIndex(String order, String index) {
		// Picks the index whenever it can serve the order, however few rows the test table has
		dsl.execute("set local enable_seqscan = off");

		for (String filter : new String[] {"", "where done = false"}) {
			String plan = String.join("\n", dsl.fetch("explain select * from tasks " + filter + " order by " + order
							+ " limit 20")
					.getValues(0, String.class));

			assertThat(plan).as(filter).contains("Index Scan using " + index).doesNotContain("Sort");
		}
	}

	// A failed statement aborts the test transaction; a nested transaction rolls back to a savepoint instead
	private void inSavepoint(Runnable statement) {
		dsl.transaction(configuration -> statement.run());
	}

	private UUID insertTask(String name) {
		UUID id = UUID.randomUUID();
		dsl.insertInto(TASKS, TASKS.ID, TASKS.NAME).values(id, name).execute();
		return id;
	}

}
