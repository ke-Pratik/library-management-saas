package com.studycenter.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviseFeePreviewResponse {

    private Long feeId;
    private Long regNo;

    // ── Current values (BEFORE) ──
    private BigDecimal oldMonthlyDiscount;      // monthly amount (full-month value)
    private BigDecimal oldProratedDiscount;     // stored pro-rated value
    private BigDecimal oldAdmissionFee;
    private BigDecimal oldFinalFee;
    private BigDecimal oldBalance;
    private String     oldStatus;

    // ── Proposed values (AFTER) ──
    private BigDecimal newMonthlyDiscount;      // user's input (monthly amount)
    private BigDecimal newProratedDiscount;     // pro-rated for this record
    private BigDecimal newAdmissionFee;
    private BigDecimal newFinalFee;
    private BigDecimal newBalance;
    private String     newStatus;

    // ── Wallet credit if overpayment ──
    private BigDecimal walletCreditAdded;       // 0 if none

    // ── Next-month preview ──
    private BigDecimal monthlyFee;              // unchanged
    private BigDecimal nextMonthFee;            // monthlyFee − newMonthlyDiscount

    // ── Helpful flags ──
    private Boolean    isMidMonth;
    private Integer    totalDaysInMonth;
    private Integer    applicableDays;
}
