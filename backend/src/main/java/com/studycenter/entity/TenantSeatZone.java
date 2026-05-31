package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * One row per logical seat zone for a tenant. Example for a standard library:
 *   (BOYS_ONLY,  Male,   1,  17, 0)
 *   (GIRLS_ONLY, Female, 18, 30, 1)
 *   (COMMON,     NULL,   31, 65, 2)
 *
 * Future-proof: a library can define any number of zones with custom names
 * and gender rules without code changes.
 */
@Entity
@Table(name = "tenant_seat_zones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantSeatZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "zone_name", nullable = false, length = 40)
    private String zoneName;        // BOYS_ONLY | GIRLS_ONLY | COMMON | <custom>

    @Column(name = "allowed_gender", length = 10)
    private String allowedGender;   // Male | Female | null (any)

    @Column(name = "start_seat", nullable = false)
    private Integer startSeat;

    @Column(name = "end_seat", nullable = false)
    private Integer endSeat;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @PrePersist
    void prePersist() {
        if (tenantId == null && TenantContext.getTenantId() != null) {
            tenantId = TenantContext.getTenantId();
        }
        if (displayOrder == null) displayOrder = 0;
    }
}
