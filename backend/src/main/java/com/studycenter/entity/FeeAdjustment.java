package com.studycenter.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fee_adjustments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "adjustment_id")
    private Long adjustmentId;

    @Column(name = "fee_id", nullable = false)
    private Long feeId;

    @Column(name = "reg_no", nullable = false)
    private Long regNo;

    @Column(name = "adjustment_type", nullable = false, length = 40)
    private String adjustmentType;     // DISCOUNT_REVISED, ADMISSION_REVISED, SLOT_CHANGED, etc.

    @Column(name = "old_values", nullable = false, columnDefinition = "TEXT")
    private String oldValues;          // JSON

    @Column(name = "new_values", nullable = false, columnDefinition = "TEXT")
    private String newValues;          // JSON

    @Column(name = "delta_amount", precision = 10, scale = 2)
    private BigDecimal deltaAmount;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "adjusted_by", length = 50)
    private String adjustedBy;

    @Column(name = "adjusted_at", nullable = false)
    private LocalDateTime adjustedAt;

    @PrePersist
    void onCreate() {
        if (adjustedAt == null) adjustedAt = LocalDateTime.now();
    }
}
