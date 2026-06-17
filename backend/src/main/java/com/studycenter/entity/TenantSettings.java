package com.studycenter.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "tenant_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantSettings {

    @Id
    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "total_seats")
    private Integer totalSeats;

    @Column(name = "operating_hours_start")
    private LocalTime operatingHoursStart;

    @Column(name = "operating_hours_end")
    private LocalTime operatingHoursEnd;

    @Column(name = "has_boys_zone")
    private Boolean hasBoysZone;

    @Column(name = "has_girls_zone")
    private Boolean hasGirlsZone;

    @Column(name = "has_common_zone")
    private Boolean hasCommonZone;

    @Column(name = "currency_symbol")
    private String currencySymbol;

    @Column(name = "timezone")
    private String timezone;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /** Per-hour fallback fee when no exact slot match found in fee_structure */
    @Column(name = "hourly_fee", precision = 10, scale = 2)
    private BigDecimal hourlyFee;

    /** Next reg_no to assign for this tenant. Incremented atomically on each registration. */
    @Builder.Default
    @Column(name = "next_reg_no")
    private Long nextRegNo = 1L;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = LocalDateTime.now();
    }
}
