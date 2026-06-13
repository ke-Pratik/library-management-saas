package com.studycenter.service;

import com.studycenter.config.SeatConfig;
import com.studycenter.dto.CancelBookingResponse;
import com.studycenter.dto.ChangeSeatRequest;
import com.studycenter.dto.ChangeSeatResponse;
import com.studycenter.dto.SeatAllotRequest;
import com.studycenter.dto.SeatAllotResponse;
import com.studycenter.dto.SeatAvailabilityResponse;
import com.studycenter.dto.SeatFullStatusResponse;
import com.studycenter.dto.StudentBookingDetail;
import com.studycenter.dto.StudentBookingsResponse;
import com.studycenter.dto.VacantSeatResponse;
import com.studycenter.entity.SeatBooking;
import com.studycenter.entity.Student;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.exception.StudentNotFoundException;
import com.studycenter.repository.SeatBookingRepository;
import com.studycenter.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class SeatService {

    private final SeatBookingRepository seatBookingRepository;
    private final StudentRepository studentRepository;
    private final SeatConfig seatConfig;
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    private void validateTimeRange(LocalTime start, LocalTime end) {
        if (!start.isBefore(end))
            throw new InvalidRequestException("startTime must be before endTime");
    }

    public SeatAvailabilityResponse checkSeatAvailability(int seatNo, String gender, LocalTime inTime, LocalTime outTime) {

        validateTimeRange(inTime, outTime);

        if (seatNo < 1 || seatNo > seatConfig.getTotalSeats())
            throw new InvalidRequestException("Seat must be between 1 and " + seatConfig.getTotalSeats());

        String zone = seatConfig.getZoneLabel(seatNo);
        boolean genderAllowed = seatConfig.isGenderAllowedOnSeat(seatNo, gender);
        boolean isAvailable = !seatBookingRepository.existsBySeatNoAndStartTimeLessThanAndEndTimeGreaterThan(seatNo, outTime, inTime);

        List<SeatBooking> bookings = seatBookingRepository.findBySeatNo(seatNo);

        List<String> existingBookings = bookings.stream()
                .map(b -> b.getStartTime().format(TIME_FMT) + " - " + b.getEndTime().format(TIME_FMT)
                        + " (RegNo: " + b.getRegNo() + ")")
                .toList();

        String message;
        SeatBooking occupiedBooking = bookings.stream()
                .filter(b -> outTime.isAfter(b.getStartTime()) && inTime.isBefore(b.getEndTime()))
                .findFirst()
                .orElse(null);

        if (!genderAllowed) message = "Seat " + seatNo + " (" + zone + ") not allowed for " + gender;
        else if (!isAvailable) message = "Seat " + seatNo + " is booked for overlapping time";
        else message = "Seat " + seatNo + " is AVAILABLE for " + inTime.format(TIME_FMT) + " - " + outTime.format(TIME_FMT);

        String occupiedStudentName = null;
        Long occupiedRegNo = null;

        if (occupiedBooking != null) {
            occupiedRegNo = occupiedBooking.getRegNo();
            List<Student> students = studentRepository.searchActiveByRegNo(occupiedRegNo);
            if (!students.isEmpty()) occupiedStudentName = students.get(0).getName();
        }

        return SeatAvailabilityResponse.builder()
                .seatNo(seatNo).zone(zone).genderAllowed(genderAllowed)
                .isAvailable(isAvailable && genderAllowed).message(message)
                .existingBookings(existingBookings)
                .studentName(occupiedStudentName).regNo(occupiedRegNo)
                .occupiedTimeSlot(occupiedBooking != null
                        ? occupiedBooking.getStartTime().format(TIME_FMT) + " - " + occupiedBooking.getEndTime().format(TIME_FMT)
                        : null)
                .bookingDate(occupiedBooking != null ? occupiedBooking.getBookingDate().toString() : null)
                .build();
    }

    public VacantSeatResponse getVacantSeats(String gender, LocalTime inTime, LocalTime outTime) {

        validateTimeRange(inTime, outTime);

        List<VacantSeatResponse.VacantSeat> vacantSeats = new ArrayList<>();

        for (int i = 1; i <= seatConfig.getTotalSeats(); i++) {
            if (!seatConfig.isGenderAllowedOnSeat(i, gender)) continue;
            boolean occupied = seatBookingRepository.existsBySeatNoAndStartTimeLessThanAndEndTimeGreaterThan(i, outTime, inTime);
            if (!occupied) {
                vacantSeats.add(VacantSeatResponse.VacantSeat.builder()
                        .seatNo(i).zone(seatConfig.getZoneLabel(i)).build());
            }
        }

        return VacantSeatResponse.builder()
                .gender(gender)
                .requestedSlot(inTime.format(TIME_FMT) + " - " + outTime.format(TIME_FMT))
                .totalVacant(vacantSeats.size())
                .vacantSeats(vacantSeats)
                .build();
    }

    public SeatFullStatusResponse getFullSeatStatus() {

        List<SeatFullStatusResponse.SeatDetail> seats = new ArrayList<>();
        int occupied = 0;

        for (int i = 1; i <= seatConfig.getTotalSeats(); i++) {
            List<SeatBooking> bookings = seatBookingRepository.findBySeatNo(i);

            List<SeatFullStatusResponse.BookingInfo> bookingInfos = bookings.stream()
                    .map(b -> {
                        String name = studentRepository.findById(b.getRegNo())
                                .map(Student::getName).orElse("Unknown");
                        return SeatFullStatusResponse.BookingInfo.builder()
                                .bookingId(b.getBookingId()).regNo(b.getRegNo())
                                .studentName(name).gender(b.getGender())
                                .timeSlot(b.getStartTime().format(TIME_FMT) + " - " + b.getEndTime().format(TIME_FMT))
                                .build();
                    }).toList();

            String status = bookings.isEmpty() ? "VACANT" : "OCCUPIED";
            if (!bookings.isEmpty()) occupied++;

            seats.add(SeatFullStatusResponse.SeatDetail.builder()
                    .seatNo(i).zone(seatConfig.getZoneLabel(i)).status(status)
                    .bookings(bookingInfos).build());
        }

        List<SeatFullStatusResponse.ZoneDef> zoneDefs = seatConfig.zonesForCurrentTenant().stream()
                .map(z -> SeatFullStatusResponse.ZoneDef.builder()
                        .zoneName(z.getZoneName()).allowedGender(z.getAllowedGender())
                        .startSeat(z.getStartSeat()).endSeat(z.getEndSeat())
                        .displayOrder(z.getDisplayOrder()).build())
                .toList();

        return SeatFullStatusResponse.builder()
                .totalSeats(seatConfig.getTotalSeats()).occupiedSeats(occupied)
                .vacantSeats(seatConfig.getTotalSeats() - occupied)
                .seats(seats).zones(zoneDefs).build();
    }

    @Transactional
    public SeatAllotResponse allotSeat(SeatAllotRequest request) {

        log.info("Allotting seat: seatNo={}, regNo={}", request.getSeatNo(), request.getRegNo());

        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException("Student " + request.getRegNo() + " not found."));

        if (!student.getIsActive())
            throw new InvalidRequestException("Student " + request.getRegNo() + " is inactive.");

        LocalTime startTime = LocalTime.parse(request.getStartTime(), TIME_FMT);
        LocalTime endTime   = LocalTime.parse(request.getEndTime(),   TIME_FMT);
        validateTimeRange(startTime, endTime);

        int seatNo = request.getSeatNo();
        if (seatNo < 1 || seatNo > seatConfig.getTotalSeats())
            throw new InvalidRequestException("Seat must be between 1 and " + seatConfig.getTotalSeats());

        if (!seatConfig.isGenderAllowedOnSeat(seatNo, student.getGender()))
            throw new InvalidRequestException("Seat " + seatNo + " (" + seatConfig.getZoneLabel(seatNo) + ") not allowed for " + student.getGender());

        if (seatBookingRepository.existsBySeatNoAndStartTimeLessThanAndEndTimeGreaterThan(seatNo, endTime, startTime))
            throw new InvalidRequestException("Seat " + seatNo + " already booked for overlapping time.");

        if (seatBookingRepository.existsByRegNoAndStartTimeLessThanAndEndTimeGreaterThan(request.getRegNo(), endTime, startTime))
            throw new InvalidRequestException("Student " + request.getRegNo() + " already has a booking for overlapping time.");

        LocalDate today = LocalDate.now();
        SeatBooking booking = SeatBooking.builder()
                .seatNo(seatNo).regNo(request.getRegNo()).gender(student.getGender())
                .startTime(startTime).endTime(endTime)
                .bookingMonth(today.getMonthValue()).bookingYear(today.getYear())
                .bookingDate(today).build();

        SeatBooking saved = seatBookingRepository.save(booking);

        return SeatAllotResponse.builder()
                .message("Seat allotted successfully!")
                .bookingId(saved.getBookingId()).seatNo(saved.getSeatNo())
                .zone(seatConfig.getZoneLabel(seatNo)).regNo(saved.getRegNo())
                .studentName(student.getName()).gender(student.getGender())
                .timeSlot(request.getStartTime() + " - " + request.getEndTime())
                .bookingDate(saved.getBookingDate().toString()).build();
    }

    @Transactional
    public CancelBookingResponse cancelBooking(Long bookingId) {

        SeatBooking booking = seatBookingRepository.findById(bookingId)
                .orElseThrow(() -> new InvalidRequestException("Booking " + bookingId + " not found."));

        String studentName = studentRepository.findById(booking.getRegNo())
                .map(Student::getName).orElse("Unknown");

        seatBookingRepository.delete(booking);

        return CancelBookingResponse.builder()
                .message("Booking cancelled successfully.")
                .bookingId(bookingId).seatNo(booking.getSeatNo())
                .regNo(booking.getRegNo()).studentName(studentName)
                .freedSlot(booking.getStartTime().format(TIME_FMT) + " - " + booking.getEndTime().format(TIME_FMT))
                .build();
    }

    @Transactional
    public ChangeSeatResponse changeSeat(ChangeSeatRequest request) {

        log.info("Changing seat: regNo={}, newSeatNo={}", request.getRegNo(), request.getNewSeatNo());

        // 1. Validate student exists and is active
        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException("Student " + request.getRegNo() + " not found."));

        if (!student.getIsActive())
            throw new InvalidRequestException("Cannot change seat for inactive student " + request.getRegNo());

        // 2. Find the student's existing booking matching their registered time slot
        List<SeatBooking> bookings = seatBookingRepository
                .findByRegNoOrderBySeatNoAscStartTimeAsc(request.getRegNo());

        if (bookings.isEmpty())
            throw new InvalidRequestException(
                    "Student " + request.getRegNo() + " has no active seat booking. Use Allot Seat instead.");

        // Match booking to student's registered in/out time
        LocalTime studentIn  = student.getInTime();
        LocalTime studentOut = student.getOutTime();

        SeatBooking booking = bookings.stream()
                .filter(b -> b.getStartTime().equals(studentIn) && b.getEndTime().equals(studentOut))
                .findFirst()
                .orElse(bookings.get(0)); // fallback to first if no exact match

        int oldSeatNo = booking.getSeatNo();
        int newSeatNo = request.getNewSeatNo();

        // 3. Same seat check
        if (oldSeatNo == newSeatNo)
            throw new InvalidRequestException(
                    "New seat (" + newSeatNo + ") is the same as the current seat. No change needed.");

        // 4. Validate new seat bounds
        if (newSeatNo < 1 || newSeatNo > seatConfig.getTotalSeats())
            throw new InvalidRequestException(
                    "Seat must be between 1 and " + seatConfig.getTotalSeats());

        // 5. Validate gender zone rule for new seat
        if (!seatConfig.isGenderAllowedOnSeat(newSeatNo, student.getGender()))
            throw new InvalidRequestException(
                    "Seat " + newSeatNo + " (" + seatConfig.getZoneLabel(newSeatNo) + ") is not allowed for " + student.getGender());

        // 6. Check new seat availability for the SAME time slot
        boolean conflict = seatBookingRepository
                .existsBySeatNoAndStartTimeLessThanAndEndTimeGreaterThan(
                        newSeatNo, booking.getEndTime(), booking.getStartTime());

        if (conflict)
            throw new InvalidRequestException(
                    "Seat " + newSeatNo + " is already booked for " +
                    booking.getStartTime().format(TIME_FMT) + " - " + booking.getEndTime().format(TIME_FMT));

        // 7. Atomic UPDATE in place — student is never left without a seat
        String oldZone = seatConfig.getZoneLabel(oldSeatNo);
        String newZone = seatConfig.getZoneLabel(newSeatNo);
        booking.setSeatNo(newSeatNo);
        seatBookingRepository.save(booking);

        log.info("Seat changed: regNo={}, {} → {}", request.getRegNo(), oldSeatNo, newSeatNo);

        return ChangeSeatResponse.builder()
                .message("Seat changed successfully! " + student.getName() +
                         " moved from Seat " + oldSeatNo + " to Seat " + newSeatNo)
                .regNo(request.getRegNo())
                .studentName(student.getName())
                .oldSeatNo(oldSeatNo)
                .newSeatNo(newSeatNo)
                .oldZone(oldZone)
                .newZone(newZone)
                .timeSlot(booking.getStartTime().format(TIME_FMT) + " - " + booking.getEndTime().format(TIME_FMT))
                .changedOn(LocalDate.now().toString())
                .build();
    }

    public StudentBookingsResponse getStudentBookings(Long regNo) {

        Student student = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found."));

        List<SeatBooking> bookings = seatBookingRepository.findByRegNoOrderBySeatNoAscStartTimeAsc(regNo);

        List<StudentBookingDetail> details = bookings.stream()
                .map(b -> StudentBookingDetail.builder()
                        .bookingId(b.getBookingId()).seatNo(b.getSeatNo())
                        .zone(seatConfig.getZoneLabel(b.getSeatNo()))
                        .timeSlot(b.getStartTime().format(TIME_FMT) + " - " + b.getEndTime().format(TIME_FMT))
                        .bookingDate(b.getBookingDate().toString()).build())
                .toList();

        return StudentBookingsResponse.builder()
                .regNo(regNo).studentName(student.getName()).gender(student.getGender())
                .isActive(student.getIsActive()).totalBookings(details.size())
                .bookings(details).build();
    }

    public Object getSeatAvailability(String gender, LocalTime inTime, LocalTime outTime, Integer seatNo) {
        if (seatNo != null) return checkSeatAvailability(seatNo, gender, inTime, outTime);
        return getVacantSeats(gender, inTime, outTime);
    }
}
