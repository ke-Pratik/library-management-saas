package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal; // ← ENHANCEMENT #1: added import

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentRegisterResponse {

    // ── Original fields ───────────────────────────────────────────────
    private String message;
    private Long regNo;
    private String name;
    private String gender;
    private String dateOfAdmission;
    private String inTime;
    private String outTime;

    // ── ENHANCEMENT #1: Fee summary shown on registration confirmation card ──
    private Long feeId;               // ID of the FeeRecord created
    private String timeSlot;          // e.g. "06:00 - 10:00"
    private BigDecimal monthlyFee;    // base monthly fee from FeeStructure
    private BigDecimal proratedFee;   // pro-rated for this month (= monthlyFee if 1st)
    private BigDecimal admissionFee;  // one-time admission fee charged
    private BigDecimal discountAmount;// discount applied this month (pro-rated if mid-month)
    private BigDecimal finalFee;      // what student owes this month
    private int feeMonth;             // e.g. 5
    private int feeYear;              // e.g. 2026
    private BigDecimal nextMonthFee;  // what student will pay every month from next month
    private String nextMonthMessage;  // human-readable next month fee info
    // ── END ENHANCEMENT #1 ───────────────────────────────────────────
}
