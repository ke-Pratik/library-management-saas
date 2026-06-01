package com.studycenter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeePaymentRequest {

    @NotNull(message = "regNo is required")
    private Long regNo;

    @NotNull(message = "feeMonth is required")
    private Integer feeMonth;

    @NotNull(message = "feeYear is required")
    private Integer feeYear;

    @NotNull(message = "payAmount is required")
    private BigDecimal payAmount;

    @NotNull(message = "paymentMode is required (CASH / ONLINE)")
    private String paymentMode;

    private String remarks;

    // Optional - if null backend uses LocalDate.now()
    // Used by admins to record cash physically collected on a previous date.
    private LocalDate paymentDate;
}
