package com.quizplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "quizplatform.cors")
public record CorsProperties(List<String> allowedOrigins) {}
