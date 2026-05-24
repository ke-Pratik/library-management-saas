package com.studycenter.repository;

import com.studycenter.entity.SeatBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;

@Repository
public interface SeatBookingRepository extends JpaRepository<SeatBooking, Long> {

    boolean existsBySeatNoAndStartTimeLessThanAndEndTimeGreaterThan(int seatNo, LocalTime endTime, LocalTime startTime);

    boolean existsByRegNoAndStartTimeLessThanAndEndTimeGreaterThan(Long regNo, LocalTime endTime, LocalTime startTime);

    List<SeatBooking> findBySeatNo(int seatNo);

    List<SeatBooking> findByRegNoOrderBySeatNoAscStartTimeAsc(Long regNo);

    long countByRegNo(Long regNo);

    void deleteByRegNo(Long regNo);

    // ── 1. Gate check: how many seats are booked in the new slot this month? ──
// Excludes the student being edited (their seat is about to be freed anyway).
// Scoped to current month/year to avoid counting stale old-month records.
@Query(value =
    "SELECT COUNT(DISTINCT sb.seat_no) FROM seat_bookings sb " +
    "WHERE sb.start_time    < :endTime   " +
    "AND   sb.end_time      > :startTime " +
    "AND   sb.reg_no       != :regNo     " +
    "AND   sb.booking_month = :month     " +
    "AND   sb.booking_year  = :year",
    nativeQuery = true)
long countBookedSeatsForSlotExcludingStudent(
    @Param("startTime") LocalTime startTime,
    @Param("endTime")   LocalTime endTime,
    @Param("regNo")     Long      regNo,
    @Param("month")     int       month,
    @Param("year")      int       year);

// ── 2. Check if a specific seat has ANY conflict in the new slot this month ──
// Used to decide whether the student's old seat can be auto-reallotted.
@Query(value =
    "SELECT COUNT(*) FROM seat_bookings sb " +
    "WHERE sb.seat_no       = :seatNo    " +
    "AND   sb.start_time    < :endTime   " +
    "AND   sb.end_time      > :startTime " +
    "AND   sb.reg_no       != :regNo     " +
    "AND   sb.booking_month = :month     " +
    "AND   sb.booking_year  = :year",
    nativeQuery = true)
long countConflictsForSeat(
    @Param("seatNo")    Integer   seatNo,
    @Param("startTime") LocalTime startTime,
    @Param("endTime")   LocalTime endTime,
    @Param("regNo")     Long      regNo,
    @Param("month")     int       month,
    @Param("year")      int       year);

// ── 3. Get student's current month booking (to capture seat before deletion) ──
Optional<SeatBooking> findFirstByRegNoAndBookingMonthAndBookingYear(
    Long regNo, int bookingMonth, int bookingYear);
}
