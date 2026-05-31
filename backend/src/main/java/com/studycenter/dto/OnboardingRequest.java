package com.studycenter.dto;

import lombok.Data;

import java.util.List;

@Data
public class OnboardingRequest {
    private Integer totalSeats;
    private String operatingHoursStart;          // "HH:mm"
    private String operatingHoursEnd;            // "HH:mm"
    private Boolean hasBoysZone;                 // retained for UI symmetry / reports
    private Boolean hasGirlsZone;
    private Boolean hasCommonZone;
    private String currencySymbol;
    private String timezone;

    /**
     * Explicit zone layout. Each zone defines a contiguous seat range and an
     * optional gender restriction. Ranges should cover [1..totalSeats] without
     * gaps for a fully-bookable library, but the backend does NOT enforce
     * exhaustive coverage - only that ranges are valid and do not overlap.
     */
    private List<ZoneDefinition> zones;

    @Data
    public static class ZoneDefinition {
        private String zoneName;        // BOYS_ONLY | GIRLS_ONLY | COMMON | <custom>
        private String allowedGender;   // "Male" | "Female" | null/empty (any)
        private Integer startSeat;
        private Integer endSeat;
        private Integer displayOrder;   // optional; defaults to insertion order
    }
}
