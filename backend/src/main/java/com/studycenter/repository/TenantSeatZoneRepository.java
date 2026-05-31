package com.studycenter.repository;

import com.studycenter.entity.TenantSeatZone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TenantSeatZoneRepository extends JpaRepository<TenantSeatZone, Long> {

    List<TenantSeatZone> findByTenantIdOrderByDisplayOrderAsc(UUID tenantId);

    // RLS-friendly: tenant_id is filtered by app.current_tenant Postgres GUC.
    List<TenantSeatZone> findAllByOrderByDisplayOrderAsc();

    void deleteByTenantId(UUID tenantId);
}
