package com.quizplatform;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

// Smoke test: starts the full Spring context against a Testcontainers Postgres
// (Flyway runs migrations on boot). If this passes, dependency wiring, JPA
// mappings, and Flyway scripts are all consistent with the codebase.
//
// JWT validation needs a reachable issuer-uri at startup; we don't have one
// in tests, so OAuth2 resource-server auto-config is excluded for this slice.
// QuizControllerIT (separate class, follow-up) covers the auth path with
// MockMvc + manually-issued tokens.
@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration"
})
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class ApplicationContextTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void contextLoads() {
        // The fact that @SpringBootTest succeeded is the assertion.
    }
}
