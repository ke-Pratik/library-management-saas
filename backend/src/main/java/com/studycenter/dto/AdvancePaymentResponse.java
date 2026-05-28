package com.studycenter.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdvancePaymentResponse {
    private String              message;
    private String              paymentId;
    private Long                regNo;
    private BigDecimal          totalReceived;
    private BigDecimal          walletApplied;
    private BigDecimal          walletCreditAdded;
    private List<Allocation>    allocations;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Allocation {
        private Long       feeId;
        private int        month;
        private int        year;
        private BigDecimal amountAllocated;
        private BigDecimal newBalance;
        private String     newStatus;
        private String     receiptNumber;
    }
}
