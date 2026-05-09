package com.studycenter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeLockRequest {

    @NotNull(message = "regNo is required")
    private Long regNo;

    @NotNull(message = "inTime is required (HH:mm)")
    private String inTime;

    @NotNull(message = "outTime is required (HH:mm)")
    private String outTime;

    @NotNull(message = "joiningDate is required (yyyy-MM-dd)")
    private LocalDate joiningDate;

    private BigDecimal discountAmount;

    private BigDecimal admissionFee;   // optional, null = 0 (only for first lock)

    private String remarks;
}
