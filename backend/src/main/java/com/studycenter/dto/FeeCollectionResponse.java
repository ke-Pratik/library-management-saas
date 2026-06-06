package com.studycenter.dto;

import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FeeCollectionResponse {

    // Period label
    private String period;

    // Student counts (billing view — fee_month based)
    private int totalStudents;
    private int paidCount;
    private int pendingCount;
    private int partialCount;

    // Billing view (fee_month based)
    private BigDecimal totalFeeExpected;   // SUM finalFee for this fee_month
    private BigDecimal totalCollected;     // SUM paidAmount for this fee_month
    private BigDecimal totalBalance;       // SUM balanceAmount for this fee_month only
    private BigDecimal cashCollected;      // paidAmount where mode=CASH for this fee_month
    private BigDecimal onlineCollected;    // paidAmount where mode=ONLINE for this fee_month

    // Cash flow view (payment_date based)
    private BigDecimal oldDuesRecovered;   // Backlog Collected: prev month fees paid this month
    private BigDecimal totalCashReceived;  // totalCollected + oldDuesRecovered

    // Outstanding view (active students, all months through current)
    private BigDecimal priorMonthDues;       // Backlog Pending: active students, months before current
    private BigDecimal totalOutstandingDues; // totalBalance + priorMonthDues
}
