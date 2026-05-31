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

/**
 * Validates SYSADMIN-scope JWTs on /api/sysadmin/** (excluding /api/sysadmin/auth/**).
 */
@Component
@RequiredArgsConstructor
public class SysadminJwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String p = request.getRequestURI();
        return !p.startsWith("/api/sysadmin/") || p.startsWith("/api/sysadmin/auth/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String auth = req.getHeader("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) {
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing token");
            return;
        }
        try {
            Claims c = jwtUtil.parse(auth.substring(7));
            if (!JwtUtil.SCOPE_SYSADMIN.equals(c.get("scope", String.class))) {
                res.sendError(HttpServletResponse.SC_FORBIDDEN, "Not a sysadmin token");
                return;
            }
            String username = c.get("username", String.class);
            var tok = new UsernamePasswordAuthenticationToken(
                    username, null, List.of(new SimpleGrantedAuthority("ROLE_SYSADMIN")));
            SecurityContextHolder.getContext().setAuthentication(tok);
            chain.doFilter(req, res);
        } catch (Exception e) {
            res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
