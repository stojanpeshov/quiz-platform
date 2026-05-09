package com.quizplatform.config;

import com.quizplatform.domain.User;
import com.quizplatform.domain.enums.UserRole;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

// Request-scoped accessor for the authenticated caller. Populated by
// JwtToUserContextFilter after the JWT has been validated and the users row
// has been upserted. Injected as a normal bean elsewhere; the proxy makes
// the scope transparent to singleton consumers.
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class UserContext {
    private UUID userId;
    private UserRole role;
    private String email;
    private String name;

    public boolean isAuthenticated() { return userId != null; }
    public boolean isAdmin() { return role == UserRole.ADMIN; }

    public UUID getUserId() { return userId; }
    public UserRole getRole() { return role; }
    public String getEmail() { return email; }
    public String getName() { return name; }

    public void set(User u) {
        this.userId = u.getId();
        this.role = u.getRole();
        this.email = u.getEmail();
        this.name = u.getName();
    }

    @Configuration
    static class Marker {} // anchors the package for component scan
}
