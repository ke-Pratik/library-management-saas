package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_allocations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentAllocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "allocation_id")
    private Long allocationId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "payment_id", nullable = false, length = 40)
    private String paymentId;

    @Column(name = "fee_id", nullable = false)
    private Long feeId;

    @Column(name = "allocated_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal allocatedAmount;

    @Column(name = "receipt_number", length = 40)
    private String receiptNumber;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (tenantId == null && TenantContext.getTenantId() != null) {
            tenantId = TenantContext.getTenantId();
        }
    }
}
