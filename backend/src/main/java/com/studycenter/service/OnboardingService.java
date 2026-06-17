package com.studycenter.service;

import com.studycenter.dto.OnboardingRequest;
import com.studycenter.entity.FeeStructure;
import com.studycenter.entity.Tenant;
import com.studycenter.entity.TenantSeatZone;
import com.studycenter.entity.TenantSettings;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.repository.FeeStructureRepository;
import com.studycenter.repository.TenantRepository;
import com.studycenter.repository.TenantSeatZoneRepository;
import com.studycenter.repository.TenantSettingsRepository;
import com.studycenter.tenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final TenantRepository           tenantRepository;
    private final TenantSettingsRepository   tenantSettingsRepository;
    private final TenantSeatZoneRepository   tenantSeatZoneRepository;
    private final FeeStructureRepository     feeStructureRepository;

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

        // ── 1. Save tenant settings (including hourlyFee) ─────────────────
        TenantSettings s = tenantSettingsRepository.findById(tenantId)
                .orElseGet(() -> TenantSettings.builder().tenantId(tenantId).build());
        s.setTotalSeats(req.getTotalSeats());
        s.setOperatingHoursStart(parseTime(req.getOperatingHoursStart()));
        s.setOperatingHoursEnd(parseTime(req.getOperatingHoursEnd()));
        s.setHasBoysZone(Boolean.TRUE.equals(req.getHasBoysZone()));
        s.setHasGirlsZone(Boolean.TRUE.equals(req.getHasGirlsZone()));
        s.setHasCommonZone(Boolean.TRUE.equals(req.getHasCommonZone()));
        s.setHourlyFee(req.getHourlyFee());
        if (req.getCurrencySymbol() != null) s.setCurrencySymbol(req.getCurrencySymbol());
        if (req.getTimezone() != null)       s.setTimezone(req.getTimezone());
        tenantSettingsRepository.save(s);

        // ── 2. Save seat zones ────────────────────────────────────────────
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

        // ── 3. Save fee slots into fee_structure ──────────────────────────
        // Delete existing slots for this tenant first (re-onboarding support)
        feeStructureRepository.deleteByTenantId(tenantId);
        if (req.getFeeSlots() != null && !req.getFeeSlots().isEmpty()) {
            for (OnboardingRequest.FeeSlotDefinition slot : req.getFeeSlots()) {
                LocalTime inTime  = parseTime(slot.getInTime());
                LocalTime outTime = parseTime(slot.getOutTime());
                feeStructureRepository.save(FeeStructure.builder()
                        .tenantId(tenantId)
                        .slotName(slot.getInTime() + " - " + slot.getOutTime())
                        .inTime(inTime)
                        .outTime(outTime)
                        .feeAmount(slot.getFeeAmount())
                        .isActive(true)
                        .build());
            }
        }

        // ── 4. Mark tenant as onboarded ───────────────────────────────────
        Tenant t = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new InvalidRequestException("Tenant not found"));
        t.setOnboarded(true);
        tenantRepository.save(t);

        return Map.of("onboarded", true);
    }

    private void validate(OnboardingRequest req) {
        // ── Basic settings ────────────────────────────────────────────────
        if (req.getTotalSeats() == null || req.getTotalSeats() < 1)
            throw new InvalidRequestException("totalSeats must be >= 1");
        if (req.getOperatingHoursStart() == null || req.getOperatingHoursEnd() == null)
            throw new InvalidRequestException("Operating hours are required");

        LocalTime opStart = parseTime(req.getOperatingHoursStart());
        LocalTime opEnd   = parseTime(req.getOperatingHoursEnd());
        if (!opStart.isBefore(opEnd))
            throw new InvalidRequestException("operatingHoursStart must be before operatingHoursEnd");

        // ── Hourly fee ────────────────────────────────────────────────────
        if (req.getHourlyFee() == null || req.getHourlyFee().compareTo(BigDecimal.ZERO) <= 0)
            throw new InvalidRequestException("hourlyFee is required and must be greater than 0");

        // ── Fee slots ─────────────────────────────────────────────────────
        if (req.getFeeSlots() != null) {
            for (int i = 0; i < req.getFeeSlots().size(); i++) {
                OnboardingRequest.FeeSlotDefinition slot = req.getFeeSlots().get(i);
                String label = "Fee slot " + (i + 1);

                if (slot.getInTime()  == null || slot.getInTime().isBlank())
                    throw new InvalidRequestException(label + ": inTime is required");
                if (slot.getOutTime() == null || slot.getOutTime().isBlank())
                    throw new InvalidRequestException(label + ": outTime is required");
                if (slot.getFeeAmount() == null || slot.getFeeAmount().compareTo(BigDecimal.ZERO) <= 0)
                    throw new InvalidRequestException(label + ": fee must be greater than 0");

                LocalTime slotIn  = parseTime(slot.getInTime());
                LocalTime slotOut = parseTime(slot.getOutTime());

                if (!slotIn.isBefore(slotOut))
                    throw new InvalidRequestException(label + ": inTime must be before outTime");
                if (slotIn.isBefore(opStart))
                    throw new InvalidRequestException(label + ": inTime " + slot.getInTime()
                            + " is before library opening time " + req.getOperatingHoursStart());
                if (slotOut.isAfter(opEnd))
                    throw new InvalidRequestException(label + ": outTime " + slot.getOutTime()
                            + " is after library closing time " + req.getOperatingHoursEnd());
            }
        }

        // ── Zones ─────────────────────────────────────────────────────────
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
            ranges.add(new int[]{z.getStartSeat(), z.getEndSeat()});
        }

        ranges.sort(Comparator.comparingInt(a -> a[0]));
        for (int i = 1; i < ranges.size(); i++) {
            if (ranges.get(i)[0] <= ranges.get(i - 1)[1])
                throw new InvalidRequestException(
                        "Zone seat ranges overlap (seat " + ranges.get(i)[0] + " appears in two zones)");
        }
        if (ranges.get(0)[0] != 1)
            throw new InvalidRequestException(
                    "Zones must start from seat 1. First zone starts at seat " + ranges.get(0)[0]);
        for (int i = 1; i < ranges.size(); i++) {
            int prevEnd   = ranges.get(i - 1)[1];
            int currStart = ranges.get(i)[0];
            if (currStart != prevEnd + 1)
                throw new InvalidRequestException(
                        "Gap between zones: seat " + (prevEnd + 1)
                                + " is not covered (next zone starts at " + currStart + ")");
        }
        int lastEnd = ranges.get(ranges.size() - 1)[1];
        if (lastEnd != total)
            throw new InvalidRequestException(
                    "Zones cover up to seat " + lastEnd + " but totalSeats is " + total
                            + ". Adjust the zones or change Total Seats so they match exactly.");
    }

    private LocalTime parseTime(String hhmm) {
        if (hhmm == null || hhmm.isBlank()) return null;
        return LocalTime.parse(hhmm);
    }

    private String emptyToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
