package com.studycenter.entity;

import com.studycenter.tenancy.TenantContext;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "seat_bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "seat_no", nullable = false)
    private int seatNo;

    @Column(name = "reg_no", nullable = false)
    private Long regNo;

    @Column(nullable = false)
    private String gender;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "booking_month")
    private int bookingMonth;

    @Column(name = "booking_year")
    private int bookingYear;

    @Column(name = "booking_date")
    private LocalDate bookingDate;

    @PrePersist
    void prePersist() {
        if (tenantId == null && TenantContext.getTenantId() != null) {
            tenantId = TenantContext.getTenantId();
        }
    }
}