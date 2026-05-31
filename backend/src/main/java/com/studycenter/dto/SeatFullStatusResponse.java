package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatFullStatusResponse {

    private int totalSeats;
    private int occupiedSeats;
    private int vacantSeats;
    private List<SeatDetail> seats;

    /**
     * Zone definitions for THIS tenant, used by the UI to render the legend,
     * filter buttons, and seat color-mapping dynamically (no hardcoded ranges).
     */
    private List<ZoneDef> zones;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SeatDetail {
        private int seatNo;
        private String zone;
        private String status;
        private List<BookingInfo> bookings;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BookingInfo {
        private Long bookingId;
        private Long regNo;
        private String studentName;
        private String gender;
        private String timeSlot;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ZoneDef {
        private String zoneName;       // e.g. BOYS_ONLY
        private String allowedGender;  // Male | Female | null
        private Integer startSeat;
        private Integer endSeat;
        private Integer displayOrder;
    }
}
