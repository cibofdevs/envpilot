package com.cibofdevs.envpilot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EnvPilotApplication {
    public static void main(String[] args) {
        SpringApplication.run(EnvPilotApplication.class, args);
    }
}