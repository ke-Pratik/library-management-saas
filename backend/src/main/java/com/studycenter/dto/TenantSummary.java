package com.studycenter.dto;

import com.studycenter.subscription.SubscriptionStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TenantSummary {
    private UUID id;
    private String libraryName;
    private String ownerName;
    private String ownerEmail;
    private String ownerMobile;
    private Boolean isActive;
    private LocalDate subscriptionUntil;
    private Boolean onboarded;
    private LocalDateTime createdAt;

    // ── NEW: computed subscription fields ──
    private SubscriptionStatus subscriptionStatus;
    private Integer daysRemaining;
    private Boolean isTrial;
    private LocalDate effectiveExpiryDate;
}
