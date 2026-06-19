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

    /** Free-trial length given to brand-new tenants at signup. */
    private static final int TRIAL_DAYS = 5;

    private final TenantRepository tenantRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JdbcTemplate jdbc;
    private final SubscriptionService subscriptionService;

    @Transactional
    public SignupResponse signup(SignupRequest r) {
        if (tenantRepository.findByOwnerEmail(r.getOwnerEmail()).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        if (userRepository.findByUsername(r.getUsername()).isPresent()) {
            throw new RuntimeException(
                    "Username '" + r.getUsername() + "' is already taken. Please pick another.");
        }

        Tenant tenant = Tenant.builder()
                .libraryName(r.getLibraryName())
                .ownerName(r.getOwnerName())
                .ownerEmail(r.getOwnerEmail())
                .ownerMobile(r.getOwnerMobile())
                .isActive(true)
                .subscriptionUntil(LocalDate.now().plusDays(TRIAL_DAYS))   // ← 5-day trial
                .onboarded(false)
                .build();
        tenant = tenantRepository.save(tenant);

        TenantContext.setTenantId(tenant.getId());
        jdbc.execute("SET LOCAL app.current_tenant = '" + tenant.getId() + "'");
        try {
            TenantSettings settings = TenantSettings.builder()
                    .tenantId(tenant.getId())
                    .currencySymbol("INR")
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
                    .libraryName(tenant.getLibraryName())
                    .onboarded(false)
                    .build();
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Login accepts EITHER a username OR an email in the `username` field.
     * Heuristic: presence of '@' means email; otherwise username.
     */
    @Transactional
    public LoginResponse login(LoginRequest r) {
        if (r.getUsername() == null || r.getUsername().isBlank()) {
            throw new RuntimeException("Username or email is required");
        }
        String input = r.getUsername().trim();

        User user;
        Tenant tenant;

        if (input.contains("@")) {
            tenant = tenantRepository.findByOwnerEmail(input.toLowerCase())
                    .orElseThrow(() -> new RuntimeException("Invalid credentials"));
            jdbc.execute("SET LOCAL app.current_tenant = '" + tenant.getId() + "'");
            user = userRepository.findFirstByTenantIdAndRole(tenant.getId(), "OWNER")
                    .orElseThrow(() -> new RuntimeException("Invalid credentials"));
        } else {
            user = userRepository.findByUsername(input)
                    .orElseThrow(() -> new RuntimeException("Invalid credentials"));
            jdbc.execute("SET LOCAL app.current_tenant = '" + user.getTenantId() + "'");
            tenant = tenantRepository.findById(user.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Invalid credentials"));
        }

        if (Boolean.FALSE.equals(tenant.getIsActive())) {
            throw new RuntimeException("Account suspended. Contact administrator.");
        }
        // ── 5-day grace period (login allowed up to subscriptionUntil + 5 days) ──
        if (!subscriptionService.isLoginAllowed(tenant)) {
            throw new RuntimeException("Subscription expired. Contact administrator.");
        }
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException("Account is disabled.");
        }
        if (!passwordEncoder.matches(r.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtil.generateTenantToken(
                tenant.getId(), user.getUserId(), user.getUsername(), user.getRole());

        return LoginResponse.builder()
                .token(token)
                .username(user.getUsername())
                .role(user.getRole())
                .tenantId(tenant.getId().toString())
                .libraryName(tenant.getLibraryName())
                .onboarded(Boolean.TRUE.equals(tenant.getOnboarded()))
                .build();
    }
}
