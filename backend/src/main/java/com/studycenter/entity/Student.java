package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @Column(name = "reg_no")
    private Long regNo;

    @Column(name = "tenant_id", nullable = false, insertable = true, updatable = false)
    private UUID tenantId;

    @Column(nullable = false)
    private String name;

    @Column(name = "father_name")
    private String fatherName;

    @Column(name = "aadhaar_no", nullable = false)
    private String aadhaarNo;

    @Column(nullable = false)
    private String gender;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String mobile;

    @Column(name = "date_of_admission", nullable = false)
    private LocalDate dateOfAdmission;

    @Column(name = "in_time")
    private LocalTime inTime;

    @Column(name = "out_time")
    private LocalTime outTime;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "deactivation_date")
    private LocalDate deactivationDate;

    /** NEW: actual last day the student used the library (may differ from deactivationDate) */
    @Column(name = "last_active_date")
    private LocalDate lastActiveDate;

    private String remarks;

    @Column(name = "wallet_balance", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal walletBalance = BigDecimal.ZERO;

    @PrePersist
    void prePersist() {
        if (tenantId == null && TenantContext.getTenantId() != null) {
            tenantId = TenantContext.getTenantId();
        }
    }
}
