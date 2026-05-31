package com.studycenter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.TimeZone;

@SpringBootApplication
@EnableTransactionManagement(order = 100)
public class StudycenterApplication {
	public static void main(String[] args) {
		// Force IANA timezone "Asia/Kolkata" before anything connects to Postgres.
		// On Indian Windows machines the JVM default is "Asia/Calcutta" (legacy alias),
		// which the Postgres JDBC driver sends at connection startup and Postgres rejects.
		// Setting it here (before SpringApplication.run) makes the fix permanent —
		// no VM options or env vars needed.
		System.setProperty("user.timezone", "Asia/Kolkata");
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));

		SpringApplication.run(StudycenterApplication.class, args);
	}
}
