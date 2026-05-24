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
}
