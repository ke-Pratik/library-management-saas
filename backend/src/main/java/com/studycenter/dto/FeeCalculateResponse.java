package com.studycenter.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeCalculateResponse {

    private Long feeId;
    private Long regNo;
    private String studentName;
    private String timeSlot;
    private String slotName;
    private int feeMonth;
    private int feeYear;
    private int totalDaysInMonth;
    private int applicableDays;
    private String joiningDate;
    private BigDecimal monthlyFee;
    private BigDecimal proratedFee;
    private BigDecimal admissionFee;      // one-time, first month only
    private BigDecimal monthlyDiscount;
    private BigDecimal proratedDiscount;
    private BigDecimal discountAmount;
    private BigDecimal finalFee;
    private String calculationMethod;
    private String calculationFormula;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private String paymentStatus;

    @JsonProperty("lockedInDb")
    private boolean lockedInDb;

    // Next month info
    @JsonProperty("isMidMonthJoining")
    private boolean isMidMonthJoining;
    private String nextMonthLabel;
    private BigDecimal nextMonthFee;
    private BigDecimal nextMonthDiscount;
    private BigDecimal nextMonthFinalFee;
    private String nextMonthMessage;
}
