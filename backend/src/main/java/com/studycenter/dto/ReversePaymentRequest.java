package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// ── ENHANCEMENT #6: Request body for POST /fees/reverse/{feeId} ──────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReversePaymentRequest {
    private String remarks; // optional — reason for reversal
}
