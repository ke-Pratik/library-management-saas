package com.studycenter.service;

import com.studycenter.dto.ResetPasswordResponse;
import com.studycenter.dto.SysadminLoginRequest;
import com.studycenter.dto.SysadminLoginResponse;
import com.studycenter.dto.TenantPaymentRequest;
import com.studycenter.dto.TenantSummary;
import com.studycenter.entity.SysadminUser;
import com.studycenter.entity.Tenant;
import com.studycenter.entity.TenantPayment;
import com.studycenter.entity.User;
import com.studycenter.repository.SysadminUserRepository;
import com.studycenter.repository.TenantPaymentRepository;
import com.studycenter.repository.TenantRepository;
import com.studycenter.repository.UserRepository;
import com.studycenter.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SysadminService {

    private final SysadminUserRepository sysadminUserRepository;
    private final TenantRepository tenantRepository;
    private final TenantPaymentRepository tenantPaymentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final JdbcTemplate jdbc;
    private final SubscriptionService subscriptionService;

    private void bindTenant(UUID tenantId) {
        jdbc.execute("SET LOCAL app.current_tenant = '" + tenantId + "'");
    }

    public SysadminLoginResponse login(SysadminLoginRequest r) {
        SysadminUser u = sysadminUserRepository.findByUsername(r.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));
        if (!Boolean.TRUE.equals(u.getIsActive())) {
            throw new RuntimeException("Account disabled");
        }
        if (!passwordEncoder.matches(r.getPassword(), u.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }
        String token = jwtUtil.generateSysadminToken(u.getId(), u.getUsername());
        return SysadminLoginResponse.builder().token(token).username(u.getUsername()).build();
    }

    public List<TenantSummary> listTenants() {
        return tenantRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
    }

    /** NEW: single-tenant fetch for the dedicated tenant management page. */
    public TenantSummary getTenant(UUID tenantId) {
        Tenant t = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
        return toSummary(t);
    }

    private TenantSummary toSummary(Tenant t) {
        SubscriptionService.Snapshot snap = subscriptionService.computeFor(t);
        return TenantSummary.builder()
                .id(t.getId())
                .libraryName(t.getLibraryName())
                .ownerName(t.getOwnerName())
                .ownerEmail(t.getOwnerEmail())
                .ownerMobile(t.getOwnerMobile())
                .isActive(t.getIsActive())
                .subscriptionUntil(t.getSubscriptionUntil())
                .onboarded(t.getOnboarded())
                .createdAt(t.getCreatedAt())
                .subscriptionStatus(snap.getStatus())
                .daysRemaining(snap.getDaysRemaining())
                .isTrial(snap.isTrial())
                .effectiveExpiryDate(snap.getEffectiveExpiryDate())
                .build();
    }

    @Transactional
    public void setActive(UUID tenantId, boolean active) {
        Tenant t = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
        t.setIsActive(active);
        tenantRepository.save(t);
    }

    @Transactional
    public TenantPayment recordPayment(UUID tenantId, TenantPaymentRequest r) {
        Tenant t = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
        bindTenant(tenantId);

        // ── Validate inputs ──
        if (r.getAmount() == null || r.getAmount().signum() <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }
        if (r.getPaidOn() == null) {
            throw new RuntimeException("Payment date is required");
        }

        LocalDate extendsTo;
        boolean isManualOverride;

        if (r.getValidUntilOverride() != null) {
            // Manual override path
            if (!r.getValidUntilOverride().isAfter(r.getPaidOn())) {
                throw new RuntimeException("Valid Until must be after the Payment Date");
            }
            extendsTo        = r.getValidUntilOverride();
            isManualOverride = true;
        } else {
            // Months-based calculation path
            if (r.getMonthsToExtend() == null || r.getMonthsToExtend() <= 0) {
                throw new RuntimeException("Either 'Months to Extend' or 'Valid Until' is required");
            }
            extendsTo        = r.getPaidOn().plusMonths(r.getMonthsToExtend());
            isManualOverride = false;
        }

        TenantPayment p = TenantPayment.builder()
                .tenantId(tenantId)
                .amount(r.getAmount())
                .paidOn(r.getPaidOn())
                .extendsTo(extendsTo)
                .paymentMode(r.getPaymentMode())
                .note(r.getNote())
                .isManualOverride(isManualOverride)
                .build();
        p = tenantPaymentRepository.save(p);

        t.setSubscriptionUntil(extendsTo);
        tenantRepository.save(t);
        return p;
    }

    @Transactional
    public List<TenantPayment> listPayments(UUID tenantId) {
        bindTenant(tenantId);
        return tenantPaymentRepository.findByTenantIdOrderByPaidOnDesc(tenantId);
    }

    @Transactional
    public ResetPasswordResponse resetOwnerPassword(UUID tenantId) {
        bindTenant(tenantId);
        User owner = userRepository.findFirstByTenantIdAndRole(tenantId, "OWNER")
                .orElseThrow(() -> new RuntimeException("Owner not found for tenant"));

        String temp = randomPassword(10);
        owner.setPassword(passwordEncoder.encode(temp));
        userRepository.save(owner);

        return ResetPasswordResponse.builder().newTempPassword(temp).build();
    }

    private String randomPassword(int len) {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        SecureRandom rnd = new SecureRandom();
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
        return sb.toString();
    }
}
