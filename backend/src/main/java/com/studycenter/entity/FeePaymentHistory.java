package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Append-only log of every individual payment transaction.
 * Used for accurate date-based aggregations in reports/dashboard.
 * Unlike fee_records (which stores cumulative paidAmount), this table records each event.
 */
@Entity
@Table(name = "fee_payment_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeePaymentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "fee_id", nullable = false)
    private Long feeId;

    @Column(name = "reg_no", nullable = false)
    private Long regNo;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_mode")
    private String paymentMode;     // CASH | ONLINE | etc.

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(name = "receipt_number")
    private String receiptNumber;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    /** Where this payment came from: PAYMENT | BULK | ADVANCE | DEACTIVATION | BACKFILL */
    @Column
    private String source;

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
