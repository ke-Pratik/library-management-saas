package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

// ── ENHANCEMENT #5: Response for POST /fees/bulk-pay ─────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkPaymentResponse {

    private String message;
    private Integer feeMonth;
    private Integer feeYear;
    private String paymentMode;
    private int totalStudents;
    private BigDecimal totalAmountCollected;
    private String paymentDate;
    private List<PaymentResult> results;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentResult {
        private Long regNo;
        private String studentName;
        private BigDecimal amountPaid;
        private BigDecimal balanceRemaining;
        private String paymentStatus;   // PAID or PARTIAL
        private String receiptNumber;
    }
}
