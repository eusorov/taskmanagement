package de.usorov.taskmanagement.controller;

import de.usorov.taskmanagement.controller.dto.ApiProblem.Violation;
import de.usorov.taskmanagement.service.TaskLimitReachedException;
import de.usorov.taskmanagement.service.TaskNotFoundException;
import de.usorov.taskmanagement.service.VersionConflictException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Maps every error to an RFC 7807 problem; validation errors carry a {@code violations} array. */
@Slf4j
@RestControllerAdvice
class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler
	ProblemDetail handle(TaskNotFoundException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler
	ProblemDetail handle(VersionConflictException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
	}

	@ExceptionHandler
	ProblemDetail handle(TaskLimitReachedException ex) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
	}

	/** Anything unexpected: log it with the stack trace, but don't leak details to the client. */
	@ExceptionHandler
	ProblemDetail handle(Exception ex) {
		log.error("Unexpected error", ex);
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected error");
	}

	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(
			MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		List<Violation> violations = ex.getBindingResult().getFieldErrors().stream()
				.map(ApiExceptionHandler::toViolation)
				.toList();
		ProblemDetail body = ex.getBody();
		body.setDetail("Invalid request");
		body.setProperty("violations", violations);
		return handleExceptionInternal(ex, body, headers, status, request);
	}

	private static Violation toViolation(FieldError error) {
		// Conversion failures (e.g. an unknown priority) carry a long technical message
		return new Violation(error.getField(), error.isBindingFailure() ? "invalid value" : error.getDefaultMessage());
	}
}
