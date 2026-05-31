package com.studycenter.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class TenantPaymentRequest {
    private BigDecimal amount;
    private LocalDate paidOn;
    private int monthsToExtend;
    private String paymentMode;
    private String note;
}
