package com.studycenter.service;

import com.studycenter.dto.SubscriptionStatus;
import com.studycenter.entity.Tenant;
import com.studycenter.repository.TenantPaymentRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Single source of truth for subscription state.
 * Trial = tenant has ZERO payments AND subscriptionUntil >= today.
 * Once a payment is recorded the tenant transitions to paid (ACTIVE/EXPIRING/GRACE/EXPIRED).
 * Grace period = 5 days past subscriptionUntil.
 */
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    public static final int GRACE_DAYS         = 5;
    public static final int EXPIRING_SOON_DAYS = 7;

    private final TenantPaymentRepository tenantPaymentRepository;

    public LocalDate effectiveExpiryDate(LocalDate subscriptionUntil) {
        if (subscriptionUntil == null) return null;
        return subscriptionUntil.plusDays(GRACE_DAYS);
    }

    /** TRUE when today is on or before effective expiry date (subscriptionUntil + 5). */
    public boolean isLoginAllowed(Tenant tenant) {
        if (tenant.getSubscriptionUntil() == null) return true;
        LocalDate effective = effectiveExpiryDate(tenant.getSubscriptionUntil());
        return !LocalDate.now().isAfter(effective);
    }

    public Snapshot computeFor(Tenant tenant) {
        LocalDate today        = LocalDate.now();
        LocalDate validUntil   = tenant.getSubscriptionUntil();
        boolean isTrial        = isTrial(tenant);

        if (validUntil == null) {
            return Snapshot.builder()
                    .status(SubscriptionStatus.ACTIVE)
                    .validUntil(null).daysRemaining(null)
                    .isTrial(false).effectiveExpiryDate(null)
                    .build();
        }

        long daysRemaining = ChronoUnit.DAYS.between(today, validUntil);
        SubscriptionStatus status;

        if (daysRemaining > EXPIRING_SOON_DAYS) {
            status = isTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;
        } else if (daysRemaining >= 0) {
            status = isTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.EXPIRING_SOON;
        } else if (daysRemaining >= -GRACE_DAYS) {
            status = SubscriptionStatus.GRACE_PERIOD;
        } else {
            status = SubscriptionStatus.EXPIRED;
        }

        return Snapshot.builder()
                .status(status)
                .validUntil(validUntil)
                .daysRemaining((int) daysRemaining)
                .isTrial(isTrial)
                .effectiveExpiryDate(effectiveExpiryDate(validUntil))
                .build();
    }

    private boolean isTrial(Tenant tenant) {
        return tenantPaymentRepository.findByTenantIdOrderByPaidOnDesc(tenant.getId()).isEmpty();
    }

    @Data
    @Builder
    public static class Snapshot {
        private SubscriptionStatus status;
        private LocalDate validUntil;
        private Integer daysRemaining;
        private boolean isTrial;
        private LocalDate effectiveExpiryDate;
    }
}
