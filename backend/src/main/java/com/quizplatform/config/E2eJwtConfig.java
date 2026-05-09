package com.quizplatform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

// Active only when the "e2e" Spring profile is set. Replaces the production
// JwtDecoder (which fetches the public key from Entra ID) with a local HMAC
// decoder keyed on a fixed test secret. The @ConditionalOnMissingBean on the
// auto-configured decoder means this bean wins as long as it is registered
// first (user @Configuration classes are processed before auto-configurations).
@Configuration
@Profile("e2e")
public class E2eJwtConfig {

    // Must be ≥32 bytes for HS256. Keep in sync with e2e/helpers/jwt.ts.
    static final String SECRET = "e2e-test-secret-key-must-32-chrs";

    @Bean
    public JwtDecoder jwtDecoder() {
        var key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        var decoder = NimbusJwtDecoder.withSecretKey(key).build();
        // Only validate exp/nbf — no issuer check (test tokens have no real issuer).
        decoder.setJwtValidator(JwtValidators.createDefault());
        return decoder;
    }
}
