package com.quizplatform.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// Public-facing health check used by load balancers, the FE preflight, and
// the verification checklist. Spring Actuator's /actuator/health is also
// allowlisted for completeness; this endpoint just returns the same shape
// the original Next.js app (and the .NET draft) used.
@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("ok", true);
    }
}
