package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "fee_structure")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeStructure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "slot_name", nullable = false)
    private String slotName;

    @Column(name = "in_time", nullable = false)
    private LocalTime inTime;

    @Column(name = "out_time", nullable = false)
    private LocalTime outTime;

    @Column(name = "fee_amount", nullable = false)
    private BigDecimal feeAmount;

    @Column(name = "is_active")
    private Boolean isActive;

    @PrePersist
    void prePersist() {
        if (tenantId == null && TenantContext.getTenantId() != null) {
            tenantId = TenantContext.getTenantId();
        }
    }
}