package com.studycenter.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "tenants")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "library_name", nullable = false)
    private String libraryName;

    @Column(name = "owner_name", nullable = false)
    private String ownerName;

    @Column(name = "owner_email", nullable = false, unique = true)
    private String ownerEmail;

    @Column(name = "owner_mobile")
    private String ownerMobile;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "subscription_until")
    private LocalDate subscriptionUntil;

    @Column(name = "onboarded")
    private Boolean onboarded;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isActive == null) isActive = Boolean.TRUE;
        if (onboarded == null) onboarded = Boolean.FALSE;
    }
}
