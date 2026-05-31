package com.studycenter.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.UUID;

/**
 * JWT helper. Supports two token scopes:
 *   - TENANT   : claims {tenant_id, user_id, username, role, scope=TENANT}
 *   - SYSADMIN : claims {sysadmin_id, username, scope=SYSADMIN}
 */
@Component
public class JwtUtil {

    public static final String SCOPE_TENANT = "TENANT";
    public static final String SCOPE_SYSADMIN = "SYSADMIN";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms:86400000}")
    private long expirationMs;

    private Key key() { return Keys.hmacShaKeyFor(secret.getBytes()); }

    public String generateTenantToken(UUID tenantId, Long userId, String username, String role) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(username)
                .claim("tenant_id", tenantId.toString())
                .claim("user_id", userId)
                .claim("username", username)
                .claim("role", role)
                .claim("scope", SCOPE_TENANT)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateSysadminToken(Long sysadminId, String username) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(username)
                .claim("sysadmin_id", sysadminId)
                .claim("username", username)
                .claim("scope", SCOPE_SYSADMIN)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMs))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody();
    }

    public boolean validate(String token) {
        try { parse(token); return true; } catch (Exception e) { return false; }
    }

    // Legacy helpers kept so existing code compiles - not used by new filters.
    public String generateToken(String username) {
        long now = System.currentTimeMillis();
        return Jwts.builder().setSubject(username)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMs))
                .signWith(key(), SignatureAlgorithm.HS256).compact();
    }
    public String extractUsername(String token) { return parse(token).getSubject(); }
    public boolean validateToken(String token) { return validate(token); }
}
