package com.studycenter.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class OnboardingRequest {
    private Integer totalSeats;
    private String operatingHoursStart;          // "HH:mm"
    private String operatingHoursEnd;            // "HH:mm"
    private Boolean hasBoysZone;
    private Boolean hasGirlsZone;
    private Boolean hasCommonZone;
    private String currencySymbol;
    private String timezone;

    /**
     * Fallback hourly fee (₹ per hour).
     * Used when no matching slot exists in fee_structure for a student's inTime/outTime.
     */
    private BigDecimal hourlyFee;

    /**
     * Explicit slot-based fee overrides.
     * Each slot defines a specific inTime-outTime pair with a fixed monthly fee.
     */
    private List<FeeSlotDefinition> feeSlots;

    /**
     * Seat zone layout. Ranges must cover [1..totalSeats] without gaps.
     */
    private List<ZoneDefinition> zones;

    @Data
    public static class ZoneDefinition {
        private String zoneName;
        private String allowedGender;   // "Male" | "Female" | null (any)
        private Integer startSeat;
        private Integer endSeat;
        private Integer displayOrder;
    }

    @Data
    public static class FeeSlotDefinition {
        private String inTime;          // "HH:mm"
        private String outTime;         // "HH:mm"
        private BigDecimal feeAmount;   // monthly fee for this slot
    }
}
