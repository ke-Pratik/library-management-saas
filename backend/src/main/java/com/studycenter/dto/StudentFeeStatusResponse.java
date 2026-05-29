package com.studycenter.dto;

import com.studycenter.entity.FeeRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentFeeStatusResponse {

    private Long    regNo;
    private String  studentName;
    private String  gender;
    private String  mobile;
    private Boolean isActive;

    // Seat info — null if no seat allotted
    private Integer seatNo;
    private String  timeSlot;

    // Fee summary
    private int        totalMonths;
    private BigDecimal totalFee;
    private BigDecimal totalPaid;
    private BigDecimal totalBalance;
    private String     overallStatus;

    // ── NEW fields ──
    private String     dateOfAdmission;   // Student's overall admission date (yyyy-MM-dd)
    private BigDecimal monthlyDiscount;   // From active StudentFeeConfig

    private List<FeeRecord> monthlyRecords;
}
