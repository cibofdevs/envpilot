package com.cibofdevs.envpilot.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class RestTemplateConfig {

    // Long timeouts: used for actual Jenkins operations (trigger build, fetch logs)
    // which can legitimately take a while.
    @Bean
    @Primary
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofSeconds(30))
                .build();
    }

    // Short timeouts: used for lightweight connectivity/health pings so a slow or
    // unreachable Jenkins instance can't stall request threads (e.g. the analytics
    // dashboard) for many seconds.
    @Bean
    public RestTemplate jenkinsHealthCheckRestTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(2))
                .setReadTimeout(Duration.ofSeconds(3))
                .build();
    }
}
