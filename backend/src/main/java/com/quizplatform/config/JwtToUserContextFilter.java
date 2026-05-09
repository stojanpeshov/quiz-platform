package com.quizplatform.config;

import com.quizplatform.infrastructure.persistence.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.UUID;

// Runs after Spring Security has validated the bearer token. Pulls the
// Entra ID claims (oid, tid, email, name), enforces the single-tenant lock
// on the `tid` claim, upserts the users row by azure_oid, and populates the
// request-scoped UserContext bean. Mirrors the `signIn`/`jwt` callbacks in
// the original lib/auth.ts.
@Component
public class JwtToUserContextFilter extends OncePerRequestFilter {

    private final UserRepository users;
    private final UserContext userContext;
    private final AzureAdProperties azure;

    public JwtToUserContextFilter(UserRepository users, UserContext userContext, AzureAdProperties azure) {
        this.users = users;
        this.userContext = userContext;
        this.azure = azure;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            try {
                upsertAndBind(jwtAuth.getToken());
            } catch (TenantLockException e) {
                res.sendError(HttpServletResponse.SC_FORBIDDEN, e.getMessage());
                return;
            } catch (MissingClaimException e) {
                res.sendError(HttpServletResponse.SC_UNAUTHORIZED, e.getMessage());
                return;
            }
        }
        chain.doFilter(req, res);
    }

    void upsertAndBind(Jwt token) {
        var tid = stringClaim(token, "tid");
        if (tid == null || !tid.equalsIgnoreCase(azure.tenantId())) {
            throw new TenantLockException("Token tenant does not match");
        }

        var oid = stringClaim(token, "oid");
        // v2 tokens use preferred_username; v1 tokens use unique_name or upn.
        var email = firstNonEmpty(
                stringClaim(token, "preferred_username"),
                stringClaim(token, "unique_name"),
                stringClaim(token, "email"),
                stringClaim(token, "upn"));
        var name = firstNonEmpty(stringClaim(token, "name"), email);

        if (oid == null || email == null) {
            throw new MissingClaimException("Token missing oid or email");
        }

        users.upsertByAzureOid(UUID.randomUUID(), oid, email, name, OffsetDateTime.now());
        var user = users.findByAzureOid(oid).orElseThrow();
        userContext.set(user);
    }

    private static String stringClaim(Jwt t, String name) {
        var v = t.getClaim(name);
        return v == null ? null : v.toString();
    }

    private static String firstNonEmpty(String... candidates) {
        for (var s : candidates) {
            if (s != null && !s.isBlank()) return s;
        }
        return null;
    }

    private static class TenantLockException extends RuntimeException {
        TenantLockException(String m) { super(m); }
    }
    private static class MissingClaimException extends RuntimeException {
        MissingClaimException(String m) { super(m); }
    }
}
