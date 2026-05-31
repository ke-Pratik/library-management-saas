package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    private String username;
    private String password;
    private String role;
    private Boolean isActive;
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (tenantId == null && TenantContext.getTenantId() != null) {
            tenantId = TenantContext.getTenantId();
        }
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
