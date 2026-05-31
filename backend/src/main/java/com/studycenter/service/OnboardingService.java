package com.studycenter.service;

import com.studycenter.dto.OnboardingRequest;
import com.studycenter.entity.Tenant;
import com.studycenter.entity.TenantSeatZone;
import com.studycenter.entity.TenantSettings;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.repository.TenantRepository;
import com.studycenter.repository.TenantSeatZoneRepository;
import com.studycenter.repository.TenantSettingsRepository;
import com.studycenter.tenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final TenantRepository tenantRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final TenantSeatZoneRepository tenantSeatZoneRepository;

    public Map<String, Boolean> status() {
        UUID tenantId = TenantContext.requireTenantId();
        boolean onboarded = tenantRepository.findById(tenantId)
                .map(t -> Boolean.TRUE.equals(t.getOnboarded()))
                .orElse(false);
        return Map.of("onboarded", onboarded);
    }

    @Transactional
    public Map<String, Boolean> complete(OnboardingRequest req) {
        UUID tenantId = TenantContext.requireTenantId();
        validate(req);

        // 1. Tenant settings
        TenantSettings s = tenantSettingsRepository.findById(tenantId)
                .orElseGet(() -> TenantSettings.builder().tenantId(tenantId).build());
        s.setTotalSeats(req.getTotalSeats());
        s.setOperatingHoursStart(parseTime(req.getOperatingHoursStart()));
        s.setOperatingHoursEnd(parseTime(req.getOperatingHoursEnd()));
        s.setHasBoysZone(Boolean.TRUE.equals(req.getHasBoysZone()));
        s.setHasGirlsZone(Boolean.TRUE.equals(req.getHasGirlsZone()));
        s.setHasCommonZone(Boolean.TRUE.equals(req.getHasCommonZone()));
        if (req.getCurrencySymbol() != null) s.setCurrencySymbol(req.getCurrencySymbol());
        if (req.getTimezone() != null) s.setTimezone(req.getTimezone());
        tenantSettingsRepository.save(s);

        // 2. Replace zones (delete-then-insert keeps it simple for V1)
        tenantSeatZoneRepository.deleteByTenantId(tenantId);
        if (req.getZones() != null) {
            int idx = 0;
            for (OnboardingRequest.ZoneDefinition z : req.getZones()) {
                tenantSeatZoneRepository.save(TenantSeatZone.builder()
                        .tenantId(tenantId)
                        .zoneName(z.getZoneName())
                        .allowedGender(emptyToNull(z.getAllowedGender()))
                        .startSeat(z.getStartSeat())
                        .endSeat(z.getEndSeat())
                        .displayOrder(z.getDisplayOrder() != null ? z.getDisplayOrder() : idx)
                        .build());
                idx++;
            }
        }

        // 3. Mark tenant onboarded
        Tenant t = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new InvalidRequestException("Tenant not found"));
        t.setOnboarded(true);
        tenantRepository.save(t);

        return Map.of("onboarded", true);
    }

    private void validate(OnboardingRequest req) {
        if (req.getTotalSeats() == null || req.getTotalSeats() < 1)
            throw new InvalidRequestException("totalSeats must be >= 1");
        if (req.getOperatingHoursStart() == null || req.getOperatingHoursEnd() == null)
            throw new InvalidRequestException("Operating hours are required");

        List<OnboardingRequest.ZoneDefinition> zones = req.getZones();
        if (zones == null || zones.isEmpty())
            throw new InvalidRequestException("At least one seat zone is required");

        int total = req.getTotalSeats();
        List<int[]> ranges = new ArrayList<>();
        for (OnboardingRequest.ZoneDefinition z : zones) {
            if (z.getZoneName() == null || z.getZoneName().isBlank())
                throw new InvalidRequestException("Zone name is required");
            if (z.getStartSeat() == null || z.getEndSeat() == null)
                throw new InvalidRequestException("Zone " + z.getZoneName() + " missing seat range");
            if (z.getStartSeat() < 1 || z.getEndSeat() > total || z.getStartSeat() > z.getEndSeat())
                throw new InvalidRequestException(
                        "Zone " + z.getZoneName() + " range must be within 1.." + total + " and start <= end");
            ranges.add(new int[]{z.getStartSeat(), z.getEndSeat(), 0});
        }

        // overlap check
        ranges.sort(Comparator.comparingInt(a -> a[0]));
        for (int i = 1; i < ranges.size(); i++) {
            if (ranges.get(i)[0] <= ranges.get(i - 1)[1]) {
                throw new InvalidRequestException("Zone seat ranges overlap");
            }
        }
    }

    private LocalTime parseTime(String hhmm) {
        if (hhmm == null || hhmm.isBlank()) return null;
        return LocalTime.parse(hhmm);
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
