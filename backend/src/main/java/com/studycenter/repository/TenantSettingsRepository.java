package com.studycenter.repository;

import com.studycenter.entity.TenantSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TenantSettingsRepository extends JpaRepository<TenantSettings, UUID> {
}
