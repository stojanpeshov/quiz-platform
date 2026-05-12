package com.quizplatform.config;

import com.quizplatform.domain.User;
import com.quizplatform.domain.enums.UserRole;
import com.quizplatform.infrastructure.persistence.UserRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

// Lives in its own bean so JwtToUserContextFilter doesn't carry @Transactional —
// that would otherwise trigger CGLIB proxying of the filter, and OncePerRequestFilter's
// final init()/doFilter() methods break under CGLIB (this.logger ends up null at
// startup, Tomcat refuses to install the filter, the whole context fails).
@Service
public class UserUpsertService {

    public static class TenantLockException extends RuntimeException {
        public TenantLockException(String m) { super(m); }
    }

    public static class MissingClaimException extends RuntimeException {
        public MissingClaimException(String m) { super(m); }
    }

    private final UserRepository users;
    private final AzureAdProperties azure;

    public UserUpsertService(UserRepository users, AzureAdProperties azure) {
        this.users = users;
        this.azure = azure;
    }

    @Transactional
    public User upsertAndBind(Jwt token) {
        var tid = stringClaim(token, "tid");
        if (tid == null || !tid.equalsIgnoreCase(azure.tenantId())) {
            throw new TenantLockException("Token tenant does not match");
        }

        var oid = stringClaim(token, "oid");
        var email = firstNonEmpty(stringClaim(token, "preferred_username"),
                                  stringClaim(token, "email"));
        var name = firstNonEmpty(stringClaim(token, "name"), email);

        if (oid == null || email == null) {
            throw new MissingClaimException("Token missing oid or email");
        }

        var user = users.findByAzureOid(oid).orElseGet(() -> {
            var u = new User();
            u.setId(UUID.randomUUID());
            u.setAzureOid(oid);
            u.setEmail(email);
            u.setName(name);
            u.setRole(UserRole.USER);
            return u;
        });
        user.setEmail(email);
        user.setName(name);
        user.setLastLoginAt(OffsetDateTime.now());
        return users.save(user);
    }

    private static String stringClaim(Jwt t, String name) {
        var v = t.getClaim(name);
        return v == null ? null : v.toString();
    }

    private static String firstNonEmpty(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        if (b != null && !b.isBlank()) return b;
        return null;
    }
}
