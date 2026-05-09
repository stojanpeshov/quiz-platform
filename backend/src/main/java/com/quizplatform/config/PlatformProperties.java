package com.quizplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "quizplatform.platform")
public record PlatformProperties(String publicUrl) {}
