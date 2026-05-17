package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// ── ENHANCEMENT #6: Response for POST /fees/reverse/{feeId} ──────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReversePaymentResponse {

    private String message;
    private Long feeId;
    private Long regNo;
    private String studentName;
    private Integer feeMonth;
    private Integer feeYear;
    private BigDecimal reversedAmount;  // amount that was undone
    private BigDecimal finalFee;        // what they still owe
    private String newStatus;           // always "PENDING" after reversal
    private String remarks;
}
