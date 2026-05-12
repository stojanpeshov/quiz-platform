package com.quizplatform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// Bound from `quizplatform.azure-ad.*` in application.yml. Used by the
// Spring Security JWT validator (audience check) and the tenant-lock filter
// (rejects tokens whose `tid` claim doesn't match this tenant).
@ConfigurationProperties(prefix = "quizplatform.azure-ad")
public record AzureAdProperties(String tenantId, String audience) {}
