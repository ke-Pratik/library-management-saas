package com.studycenter.service;

import com.studycenter.dto.LoginRequest;
import com.studycenter.dto.LoginResponse;
import com.studycenter.dto.SignupRequest;
import com.studycenter.dto.SignupResponse;
import com.studycenter.entity.Tenant;
import com.studycenter.entity.TenantSettings;
import com.studycenter.entity.User;
import com.studycenter.repository.TenantRepository;
import com.studycenter.repository.TenantSettingsRepository;
import com.studycenter.repository.UserRepository;
import com.studycenter.security.JwtUtil;
import com.studycenter.tenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final TenantRepository tenantRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JdbcTemplate jdbc;

    @Transactional
    public SignupResponse signup(SignupRequest r) {
        if (tenantRepository.findByOwnerEmail(r.getOwnerEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }

        Tenant tenant = Tenant.builder()
                .libraryName(r.getLibraryName())
                .ownerName(r.getOwnerName())
                .ownerEmail(r.getOwnerEmail())
                .ownerMobile(r.getOwnerMobile())
                .isActive(true)
                .subscriptionUntil(LocalDate.now().plusDays(30))
                .onboarded(false)
                .build();
        tenant = tenantRepository.save(tenant);

        // Bind tenant on this thread so @PrePersist picks it up,
        // and set GUC so RLS allows inserts into tenant_settings / users.
        TenantContext.setTenantId(tenant.getId());
        jdbc.execute("SET LOCAL app.current_tenant = '" + tenant.getId() + "'");
        try {
            TenantSettings settings = TenantSettings.builder()
                    .tenantId(tenant.getId())
                    .currencySymbol("₹")
                    .timezone("Asia/Kolkata")
                    .hasBoysZone(false)
                    .hasGirlsZone(false)
                    .hasCommonZone(true)
                    .build();
            tenantSettingsRepository.save(settings);

            User user = User.builder()
                    .tenantId(tenant.getId())
                    .username(r.getUsername())
                    .password(passwordEncoder.encode(r.getPassword()))
                    .role("OWNER")
                    .isActive(true)
                    .build();
            user = userRepository.save(user);

            String token = jwtUtil.generateTenantToken(
                    tenant.getId(), user.getUserId(), user.getUsername(), user.getRole());

            return SignupResponse.builder()
                    .token(token)
                    .tenantId(tenant.getId().toString())
                    .username(user.getUsername())
                    .role(user.getRole())
                    .onboarded(false)
                    .build();
        } finally {
            TenantContext.clear();
        }
    }

    @Transactional
    public LoginResponse login(LoginRequest r) {
        // r.getUsername() is treated as ownerEmail
        Tenant tenant = tenantRepository.findByOwnerEmail(r.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (Boolean.FALSE.equals(tenant.getIsActive())) {
            throw new RuntimeException("Account suspended. Contact administrator.");
        }
        if (tenant.getSubscriptionUntil() != null
                && tenant.getSubscriptionUntil().isBefore(LocalDate.now())) {
            throw new RuntimeException("Subscription expired. Contact administrator.");
        }

        // Bind GUC so RLS lets us read this tenant's users row.
        jdbc.execute("SET LOCAL app.current_tenant = '" + tenant.getId() + "'");
        User user = userRepository.findFirstByTenantIdAndRole(tenant.getId(), "OWNER")
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("Account is disabled.");
        }
        if (!passwordEncoder.matches(r.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtil.generateTenantToken(
                tenant.getId(), user.getUserId(), user.getUsername(), user.getRole());

        return LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole())
                .tenantId(tenant.getId().toString())
                .onboarded(Boolean.TRUE.equals(tenant.getOnboarded()))
                .build();
    }
}
