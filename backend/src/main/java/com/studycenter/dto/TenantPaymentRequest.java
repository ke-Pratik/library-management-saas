package com.studycenter.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TenantPaymentRequest {
    private BigDecimal amount;
    private LocalDate paidOn;

    /** Number of months to extend. Used only when validUntilOverride is null. */
    private Integer monthsToExtend;

    /** Optional manual "Valid Until" date. When provided, overrides months-based calculation. */
    private LocalDate validUntilOverride;

    private String paymentMode;
    private String note;
}
