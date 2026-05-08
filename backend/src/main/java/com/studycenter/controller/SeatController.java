package com.studycenter.controller;

import com.studycenter.dto.CancelBookingResponse;
import com.studycenter.dto.SeatAllotRequest;
import com.studycenter.dto.SeatAllotResponse;
import com.studycenter.dto.SeatAvailabilityResponse;
import com.studycenter.dto.SeatFullStatusResponse;
import com.studycenter.dto.StudentBookingsResponse;
import com.studycenter.dto.VacantSeatResponse;
import com.studycenter.service.SeatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;

@RestController
@RequestMapping("/api/seats")
@RequiredArgsConstructor
@Slf4j
public class SeatController {

    private final SeatService seatService;

    @GetMapping("/check")
    public ResponseEntity<SeatAvailabilityResponse> check(
            @RequestParam int seatNo, @RequestParam String gender,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime inTime,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime outTime) {
        return ResponseEntity.ok(seatService.checkSeatAvailability(seatNo, gender, inTime, outTime));
    }

    @GetMapping("/vacant")
    public ResponseEntity<VacantSeatResponse> vacant(
            @RequestParam String gender,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime inTime,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime outTime) {
        return ResponseEntity.ok(seatService.getVacantSeats(gender, inTime, outTime));
    }

    @GetMapping("/status")
    public ResponseEntity<SeatFullStatusResponse> status() {
        return ResponseEntity.ok(seatService.getFullSeatStatus());
    }

    @PostMapping("/allot")
    public ResponseEntity<SeatAllotResponse> allotSeat(
            @Valid @RequestBody SeatAllotRequest request) {
        return new ResponseEntity<>(seatService.allotSeat(request), HttpStatus.CREATED);
    }

    @DeleteMapping("/cancel/{bookingId}")
    public ResponseEntity<CancelBookingResponse> cancelBooking(@PathVariable Long bookingId) {
        return ResponseEntity.ok(seatService.cancelBooking(bookingId));
    }

    @GetMapping("/student/{regNo}")
    public ResponseEntity<StudentBookingsResponse> studentBookings(@PathVariable Long regNo) {
        return ResponseEntity.ok(seatService.getStudentBookings(regNo));
    }

    @GetMapping("/availability")
public ResponseEntity<?> availability(
        @RequestParam String gender,
        @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime inTime,
        @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime outTime,
        @RequestParam(required = false) Integer seatNo) {

    return ResponseEntity.ok(
            seatService.getSeatAvailability(
                    gender,
                    inTime,
                    outTime,
                    seatNo
            )
    );
}

    
}
