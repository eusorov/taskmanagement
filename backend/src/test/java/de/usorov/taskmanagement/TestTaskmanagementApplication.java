package de.usorov.taskmanagement;

import org.springframework.boot.SpringApplication;

public class TestTaskmanagementApplication {

	public static void main(String[] args) {
		SpringApplication.from(TaskmanagementApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
