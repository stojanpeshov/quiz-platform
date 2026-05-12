-- Seeds a pre-promoted admin user for E2E tests.
-- charlie@e2e.test has a fixed azure_oid that matches the JWT signed by
-- e2e/helpers/jwt.ts (CHARLIE constant). ON CONFLICT preserves the admin
-- role even after subsequent JwtToUserContextFilter upserts (the upsert
-- only updates email/name/last_login_at, not role).
INSERT INTO users (id, azure_oid, email, name, role, total_points, last_login_at)
VALUES (
    gen_random_uuid(),
    'c0a00000-0000-0000-0000-000000000003',
    'charlie@e2e.test',
    'Charlie Admin',
    'admin',
    0,
    now()
) ON CONFLICT (azure_oid) DO UPDATE SET role = 'admin';
