package com.studycenter.tenancy;

import java.util.UUID;

/**
 * ThreadLocal holder for the current tenant + user. Populated by TenantJwtFilter
 * on every request, cleared in a finally block. Read by services and the
 * Hibernate connection interceptor that sets app.current_tenant in Postgres.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> TENANT = new ThreadLocal<>();
    private static final ThreadLocal<Long> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> USERNAME = new ThreadLocal<>();

    private TenantContext() {}

    public static UUID getTenantId() { return TENANT.get(); }
    public static void setTenantId(UUID id) { TENANT.set(id); }

    public static Long getUserId() { return USER_ID.get(); }
    public static void setUserId(Long id) { USER_ID.set(id); }

    public static String getUsername() { return USERNAME.get(); }
    public static void setUsername(String u) { USERNAME.set(u); }

    public static UUID requireTenantId() {
        UUID id = TENANT.get();
        if (id == null) throw new IllegalStateException("No tenant context bound to thread");
        return id;
    }

    public static void clear() {
        TENANT.remove();
        USER_ID.remove();
        USERNAME.remove();
    }
}
