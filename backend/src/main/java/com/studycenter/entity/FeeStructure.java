package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.*;

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
    @Builder.Default
    private Boolean isActive = true;

    @PrePersist
    void prePersist() {
        // Only auto-set tenantId if not explicitly provided (e.g. via builder)
        if (tenantId == null) {
            tenantId = TenantContext.requireTenantId();
        }
        if (isActive == null) {
            isActive = true;
        }
    }
}
