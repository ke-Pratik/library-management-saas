package com.studycenter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

// ── ENHANCEMENT #5: Request body for POST /fees/bulk-pay ─────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkPaymentRequest {

    @NotNull(message = "feeMonth is required")
    private Integer feeMonth;

    @NotNull(message = "feeYear is required")
    private Integer feeYear;

    @NotNull(message = "paymentMode is required (CASH or ONLINE)")
    private String paymentMode;     // one mode for the whole batch

    @NotNull(message = "payments list cannot be empty")
    private List<PaymentItem> payments;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentItem {
        @NotNull
        private Long regNo;
        @NotNull
        private BigDecimal amount;  // can be partial or full balance
    }
}
