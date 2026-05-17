package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptResponse {
    private String  receiptNumber;
    private Long    regNo;
    private String  studentName;
    private Integer feeMonth;
    private Integer feeYear;
    private BigDecimal finalFee;
    private BigDecimal amountPaid;
    private BigDecimal balanceAmount;
    private String  paymentStatus;
    private String  paymentMode;
    private String  paymentDate;
    private String  timeSlot;
}
