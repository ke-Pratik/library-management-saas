package com.studycenter.config;

import com.studycenter.entity.TenantSeatZone;
import com.studycenter.entity.TenantSettings;
import com.studycenter.repository.TenantSeatZoneRepository;
import com.studycenter.repository.TenantSettingsRepository;
import com.studycenter.tenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Per-tenant seat layout resolver. Reads TenantSettings (total seats) and
 * TenantSeatZones (zone ranges + gender rules) for the tenant bound to the
 * current request via TenantContext.
 *
 * Public API is intentionally identical to the legacy single-tenant version
 * so that existing services (SeatService, etc.) compile and behave the same.
 *
 * Caching: queries are cheap (small rows) and run within the request's
 * @Transactional scope, so Postgres returns cached pages quickly. We don't
 * add an in-memory cache for V1 to keep onboarding edits visible immediately.
 */
@Component
@RequiredArgsConstructor
public class SeatConfig {

    private final TenantSettingsRepository settingsRepository;
    private final TenantSeatZoneRepository zoneRepository;

    public int getTotalSeats() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) return 0;
        return settingsRepository.findById(tenantId)
                .map(TenantSettings::getTotalSeats)
                .orElse(0);
    }

    public String getZoneLabel(int seatNo) {
        return zonesForCurrentTenant().stream()
                .filter(z -> seatNo >= z.getStartSeat() && seatNo <= z.getEndSeat())
                .map(TenantSeatZone::getZoneName)
                .findFirst()
                .orElse("UNKNOWN");
    }

    public boolean isGenderAllowedOnSeat(int seatNo, String gender) {
        return zonesForCurrentTenant().stream()
                .filter(z -> seatNo >= z.getStartSeat() && seatNo <= z.getEndSeat())
                .findFirst()
                .map(z -> {
                    String allowed = z.getAllowedGender();
                    if (allowed == null || allowed.isBlank()) return true;       // any gender
                    return allowed.equalsIgnoreCase(gender);
                })
                .orElse(false);   // seat number not in any defined zone
    }

    public List<TenantSeatZone> zonesForCurrentTenant() {
        UUID tenantId = TenantContext.getTenantId();
        if (tenantId == null) return List.of();
        return zoneRepository.findByTenantIdOrderByDisplayOrderAsc(tenantId);
    }
}
