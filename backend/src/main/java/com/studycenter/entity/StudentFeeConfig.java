package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "student_fee_config")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentFeeConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "config_id")
    private Long configId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    // Which student
    @Column(name = "reg_no", nullable = false)
    private Long regNo;

    // Time slot
    @Column(name = "in_time", nullable = false)
    private LocalTime inTime;

    @Column(name = "out_time", nullable = false)
    private LocalTime outTime;

    // Fee details
    @Column(name = "monthly_fee", nullable = false)
    private BigDecimal monthlyFee;

    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount; // 0 if none

    @Column(name = "admission_fee", nullable = false)
    private BigDecimal admissionFee; // 0 if none, one-time first month only

    // Validity — when was this config active
    @Column(name = "effective_from_date", nullable = false)
    private LocalDate effectiveFromDate; // joining date at admission

    @Column(name = "effective_to_date")
    private LocalDate effectiveToDate; // null = currently active

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (tenantId == null && TenantContext.getTenantId() != null) {
            tenantId = TenantContext.getTenantId();
        }
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
