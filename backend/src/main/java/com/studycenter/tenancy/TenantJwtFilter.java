package com.studycenter.tenancy;

import com.studycenter.security.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Validates tenant-scope JWTs on /api/** (excluding /api/auth/**, /api/sysadmin/**, /api/health).
 * Populates TenantContext + Spring Security context. Always clears TenantContext.
 */
@Component
@RequiredArgsConstructor
public class TenantJwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String p = request.getRequestURI();
        return p.startsWith("/api/auth/") || p.startsWith("/api/sysadmin/") || p.equals("/api/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String auth = req.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) { chain.doFilter(req, res); return; }
        String token = auth.substring(7);
        try {
            Claims claims = jwtUtil.parse(token);
            if (!JwtUtil.SCOPE_TENANT.equals(claims.get("scope", String.class))) {
                res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Wrong token scope");
                return;
            }
            UUID tenantId = UUID.fromString(claims.get("tenant_id", String.class));
            Long userId = claims.get("user_id", Number.class).longValue();
            String username = claims.get("username", String.class);
            String role = claims.get("role", String.class);

            TenantContext.setTenantId(tenantId);
            TenantContext.setUserId(userId);
            TenantContext.setUsername(username);

            var authToken = new UsernamePasswordAuthenticationToken(
                    username, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
            SecurityContextHolder.getContext().setAuthentication(authToken);

            chain.doFilter(req, res);
        } catch (Exception e) {
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
        } finally {
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }
}
