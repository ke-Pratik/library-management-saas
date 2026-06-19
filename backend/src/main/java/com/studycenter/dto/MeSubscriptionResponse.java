package com.studycenter.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class MeSubscriptionResponse {
    private SubscriptionStatus status;
    private LocalDate validUntil;
    private Integer daysRemaining;
    private Boolean isTrial;
    private LocalDate effectiveExpiryDate;   // validUntil + 5 (grace end)
    private LocalDate expiredOn;             // null unless in GRACE_PERIOD / EXPIRED
    private LocalDate graceEnds;             // = effectiveExpiryDate (convenience for UI)
    private Integer graceDaysRemaining;      // null unless in GRACE_PERIOD
}
