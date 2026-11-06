package de.usorov.taskmanagement;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import lombok.AllArgsConstructor;

/** A clock tests can set and advance. */
@AllArgsConstructor
public class TestClock extends Clock {

	private Instant now;

	public void set(Instant now) {
		this.now = now;
	}

	public void advance(Duration duration) {
		now = now.plus(duration);
	}

	@Override
	public Instant instant() {
		return now;
	}

	@Override
	public ZoneId getZone() {
		return ZoneOffset.UTC;
	}

	@Override
	public Clock withZone(ZoneId zone) {
		return this;
	}
}
