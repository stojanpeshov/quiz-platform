package com.quizplatform.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    // Polymorphic discriminators for Question/Answer are declared on the types
    // themselves via @JsonTypeInfo + @JsonSubTypes; Spring Boot's auto-configured
    // ObjectMapper picks them up. This customizer adds Java time support and
    // pretty-friendly defaults that match what the FE consumes.
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> builder
            .modulesToInstall(new JavaTimeModule())
            .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }
}
