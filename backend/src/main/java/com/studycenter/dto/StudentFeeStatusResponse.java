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

    private Long regNo;
    private String studentName;
    private String gender;
    private String mobile;
    private Boolean isActive;

    // Seat info — null if no seat allotted
    private Integer seatNo;
    private String timeSlot; // e.g. "07:00 - 12:00"

    // Fee summary
    private int totalMonths;
    private BigDecimal totalFee;
    private BigDecimal totalPaid;
    private BigDecimal totalBalance;
    private String overallStatus; // ALL_PAID / HAS_PENDING

    private List<FeeRecord> monthlyRecords;
}
