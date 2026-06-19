package com.studycenter.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenant_payments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(name = "extends_to")
    private LocalDate extendsTo;

    @Column(name = "payment_mode")
    private String paymentMode;

    @Column(name = "note")
    private String note;

    /** TRUE when admin manually entered a Valid Until date instead of using months-based calc */
    @Column(name = "is_manual_override", nullable = false)
    private Boolean isManualOverride;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isManualOverride == null) isManualOverride = Boolean.FALSE;
    }
}
