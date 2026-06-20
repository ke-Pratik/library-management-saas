package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeactivateReactivateResponse {

    private String message;
    private Long regNo;
    private String name;
    private Boolean isActive;
    private String deactivationDate;
    private String lastActiveDate;
    private String remarks;
    private int bookingsCancelled;

    // ── NEW summary fields ──
    private Boolean currentMonthDeleted;
    private BigDecimal oldFinalFee;
    private BigDecimal newFinalFee;
    private BigDecimal amountCollected;
    private BigDecimal amountWaived;
    private BigDecimal walletCreditAdded;
    private String receiptNumber;
    private int futureRecordsDeleted;
}
