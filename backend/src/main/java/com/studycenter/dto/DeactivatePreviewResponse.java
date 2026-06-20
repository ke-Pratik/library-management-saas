package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeactivatePreviewResponse {

    private Long regNo;
    private String studentName;
    private LocalDate joiningDate;
    private LocalDate lastActiveDate;
    private Integer daysUsed;
    private Integer totalDaysInMonth;

    // Current month fee snapshot (BEFORE)
    private Boolean hasCurrentMonthRecord;
    private BigDecimal oldFinalFee;
    private BigDecimal oldPaid;
    private BigDecimal oldBalance;
    private String     oldStatus;

    // Projected (AFTER)
    private BigDecimal newFinalFee;
    private BigDecimal newBalance;
    private String     newStatus;
    private BigDecimal walletCreditWillAdd;     // > 0 if overpaid after prorate
    private BigDecimal balanceAfterProRate;     // amount student still owes after prorate (could be 0)
    private Boolean    needsBalanceDecision;    // true if prorate leaves a positive balance
    private Boolean    willDeleteRecord;        // true if neverUsed flagged
    private Boolean    isMidMonthRecord;

    // Other side-effects
    private Integer    seatToCancel;            // current seat or null
    private Integer    futureRecordsCount;      // # of future-month records that will be deleted
}
