package de.usorov.taskmanagement.service;

import static de.usorov.taskmanagement.db.jooq.Tables.TASKS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import de.usorov.taskmanagement.TestcontainersConfiguration;
import de.usorov.taskmanagement.model.Priority;
import de.usorov.taskmanagement.model.TaskPage;
import de.usorov.taskmanagement.model.TaskSearch;
import de.usorov.taskmanagement.model.TaskSortField;
import de.usorov.taskmanagement.repository.TaskRepository;
import java.util.EnumSet;
import java.util.UUID;
import org.jooq.DSLContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class TaskServiceTest {

	private static final TaskSearch ALL =
			new TaskSearch(null, EnumSet.noneOf(Priority.class), null, TaskSortField.PRIORITY, false, true, 0, 50);

	@Autowired
	TaskService taskService;

	@MockitoSpyBean
	TaskRepository taskRepository;

	@Autowired
	DSLContext dsl;

	@Autowired
	PlatformTransactionManager transactionManager;

	@BeforeEach
	void setUp() {
		dsl.deleteFrom(TASKS).execute();
	}

	@Test
	void pageAndTotalSeeTheSameTasks() {
		insertTask("Before");
		var otherClient = new TransactionTemplate(transactionManager);
		otherClient.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
		doAnswer(invocation -> {
					Object items = invocation.callRealMethod();
					// Another client adds a task between the page query and the count
					otherClient.executeWithoutResult(status -> insertTask("Concurrent"));
					return items;
				})
				.when(taskRepository)
				.find(any());

		TaskPage page = taskService.find(ALL);

		assertThat(page.items()).hasSize(1);
		assertThat(page.total()).isEqualTo(1);
		// The other client's task was committed, just not seen by this search
		assertThat(dsl.fetchCount(TASKS)).isEqualTo(2);
	}

	private void insertTask(String name) {
		dsl.insertInto(TASKS, TASKS.ID, TASKS.NAME).values(UUID.randomUUID(), name).execute();
	}
}
