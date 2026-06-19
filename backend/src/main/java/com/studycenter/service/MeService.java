package com.studycenter.service;

import com.studycenter.dto.MeProfileResponse;
import com.studycenter.dto.MeSubscriptionResponse;
import com.studycenter.entity.Tenant;
import com.studycenter.entity.User;
import com.studycenter.repository.TenantRepository;
import com.studycenter.repository.UserRepository;
import com.studycenter.dto.SubscriptionStatus;
import com.studycenter.tenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MeService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    public MeProfileResponse getProfile() {
        UUID tenantId = TenantContext.requireTenantId();
        Long userId   = TenantContext.getUserId();

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return MeProfileResponse.builder()
                .tenantId(tenant.getId())
                .libraryName(tenant.getLibraryName())
                .ownerName(tenant.getOwnerName())
                .ownerEmail(tenant.getOwnerEmail())
                .ownerMobile(tenant.getOwnerMobile())
                .username(user.getUsername())
                .role(user.getRole())
                .memberSince(tenant.getCreatedAt())
                .build();
    }

    public MeSubscriptionResponse getSubscription() {
        UUID tenantId = TenantContext.requireTenantId();
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));

        SubscriptionService.Snapshot snap = subscriptionService.computeFor(tenant);

        LocalDate expiredOn          = null;
        Integer   graceDaysRemaining = null;

        if (snap.getStatus() == SubscriptionStatus.GRACE_PERIOD) {
            expiredOn          = snap.getValidUntil();
            graceDaysRemaining = (int) Math.max(0,
                    ChronoUnit.DAYS.between(LocalDate.now(), snap.getEffectiveExpiryDate()));
        } else if (snap.getStatus() == SubscriptionStatus.EXPIRED) {
            expiredOn = snap.getValidUntil();
        }

        return MeSubscriptionResponse.builder()
                .status(snap.getStatus())
                .validUntil(snap.getValidUntil())
                .daysRemaining(snap.getDaysRemaining())
                .isTrial(snap.isTrial())
                .effectiveExpiryDate(snap.getEffectiveExpiryDate())
                .expiredOn(expiredOn)
                .graceEnds(snap.getEffectiveExpiryDate())
                .graceDaysRemaining(graceDaysRemaining)
                .build();
    }
}
