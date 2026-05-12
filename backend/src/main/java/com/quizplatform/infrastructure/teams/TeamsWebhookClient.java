package com.quizplatform.infrastructure.teams;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

// Server-side only. The webhook URL is read from platform_settings by the
// caller and never exposed to the client. Errors are logged but never thrown
// — the caller's response must not be affected by Teams being down. Mirrors
// lib/teams.ts → postAchievementCard.
@Component
public class TeamsWebhookClient {

    private static final Logger log = LoggerFactory.getLogger(TeamsWebhookClient.class);
    private final RestClient http = RestClient.create();

    public void post(String webhookUrl, Object adaptiveCardEnvelope) {
        if (webhookUrl == null || webhookUrl.isBlank()) return;
        try {
            http.post()
                .uri(webhookUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .body(adaptiveCardEnvelope)
                .retrieve()
                .toBodilessEntity();
        } catch (RestClientException ex) {
            log.error("Teams webhook request failed", ex);
        }
    }
}
