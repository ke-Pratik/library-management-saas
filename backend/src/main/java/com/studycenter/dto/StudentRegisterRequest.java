package com.studycenter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal; // ← ENHANCEMENT #1: added import

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentRegisterRequest {

    @NotNull(message = "regNo is required")
    private Long regNo;

    @NotBlank(message = "name is required")
    private String name;

    private String fatherName;

    @NotBlank(message = "aadhaarNo is required")
    private String aadhaarNo;

    @NotBlank(message = "gender is required")
    private String gender;

    @NotBlank(message = "address is required")
    private String address;

    @NotBlank(message = "mobile is required")
    private String mobile;

    @NotBlank(message = "dateOfAdmission is required")
    private String dateOfAdmission;

    @NotBlank(message = "inTime is required")
    private String inTime;

    @NotBlank(message = "outTime is required")
    private String outTime;

    // ── ENHANCEMENT #1: Auto-lock fee on registration ─────────────────
    // These are optional. If not sent by frontend, they default to 0 in service.
    private BigDecimal admissionFee;    // one-time charge collected at admission
    private BigDecimal discountAmount;  // monthly discount negotiated with student
    private String remarks;             // stored on the first FeeRecord for reference
    // ── END ENHANCEMENT #1 ───────────────────────────────────────────
}
