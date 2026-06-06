package com.studycenter.repository;

import com.studycenter.entity.FeeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeeRecordRepository extends JpaRepository<FeeRecord, Long> {

    boolean existsByRegNoAndFeeMonthAndFeeYear(Long regNo, Integer feeMonth, Integer feeYear);

    Optional<FeeRecord> findByRegNoAndFeeMonthAndFeeYear(Long regNo, Integer feeMonth, Integer feeYear);

    List<FeeRecord> findByRegNoOrderByFeeYearDescFeeMonthDesc(Long regNo);

    List<FeeRecord> findByFeeMonthAndFeeYear(Integer feeMonth, Integer feeYear);

    List<FeeRecord> findByPaymentDateBetween(LocalDate startDate, LocalDate endDate);

    Optional<FeeRecord> findByReceiptNumber(String receiptNumber);

    @Query("SELECT COALESCE(SUM(f.finalFee), 0) FROM FeeRecord f WHERE f.feeMonth = :month AND f.feeYear = :year")
    BigDecimal sumFinalFeeByMonth(@Param("month") Integer month, @Param("year") Integer year);

    @Query("SELECT COALESCE(SUM(f.paidAmount), 0) FROM FeeRecord f WHERE f.feeMonth = :month AND f.feeYear = :year")
    BigDecimal sumPaidAmountByMonth(@Param("month") Integer month, @Param("year") Integer year);

    @Query("SELECT COALESCE(SUM(f.balanceAmount), 0) FROM FeeRecord f WHERE f.feeMonth = :month AND f.feeYear = :year")
    BigDecimal sumBalanceByMonth(@Param("month") Integer month, @Param("year") Integer year);

    @Query("SELECT COALESCE(SUM(f.paidAmount), 0) FROM FeeRecord f WHERE f.feeMonth = :month AND f.feeYear = :year AND f.paymentMode = :mode")
    BigDecimal sumPaidAmountByMonthAndMode(@Param("month") Integer month, @Param("year") Integer year, @Param("mode") String mode);

    @Query("SELECT COALESCE(SUM(f.finalFee), 0) FROM FeeRecord f WHERE f.paymentDate BETWEEN :start AND :end")
    BigDecimal sumFinalFeeByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(f.paidAmount), 0) FROM FeeRecord f WHERE f.paymentDate BETWEEN :start AND :end")
    BigDecimal sumPaidAmountByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(f.balanceAmount), 0) FROM FeeRecord f WHERE f.paymentDate BETWEEN :start AND :end")
    BigDecimal sumBalanceByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(f.paidAmount), 0) FROM FeeRecord f WHERE f.paymentDate BETWEEN :start AND :end AND f.paymentMode = :mode")
    BigDecimal sumPaidAmountByDateRangeAndMode(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("mode") String mode);

    @Query("SELECT COUNT(f) FROM FeeRecord f WHERE f.feeMonth = :month AND f.feeYear = :year AND f.receiptNumber IS NOT NULL")
    long countReceiptsByMonthAndYear(@Param("month") Integer month, @Param("year") Integer year);

    @Query("SELECT f FROM FeeRecord f WHERE f.regNo = :regNo " +
       "AND (f.feeYear < :year OR (f.feeYear = :year AND f.feeMonth < :month)) " +
       "AND f.paymentStatus IN ('PENDING', 'PARTIAL') " +
       "ORDER BY f.feeYear ASC, f.feeMonth ASC")
     List<FeeRecord> findPreviousUnpaidRecords(@Param("regNo") Long regNo,
                                          @Param("month") int month,
                                          @Param("year")  int year);


// ✅ FIXED — works on both PostgreSQL and MySQL (Hibernate 6 / Spring Boot 3.x)
@Query("SELECT COALESCE(SUM(f.paidAmount), 0) FROM FeeRecord f " +
   "WHERE EXTRACT(MONTH FROM f.paymentDate) = :month " +
   "AND EXTRACT(YEAR FROM f.paymentDate) = :year " +
   "AND (f.feeYear < :year OR (f.feeYear = :year AND f.feeMonth < :month))")
BigDecimal sumOldDuesRecoveredInMonth(@Param("month") int month, @Param("year") int year);    

// Backlog Pending: outstanding balance for active students in months BEFORE this month
@Query("SELECT COALESCE(SUM(f.balanceAmount), 0) FROM FeeRecord f " +
       "WHERE f.paymentStatus IN ('PENDING', 'PARTIAL') " +
       "AND f.regNo IN (SELECT s.regNo FROM Student s WHERE s.isActive = true) " +
       "AND (f.feeYear < :year OR (f.feeYear = :year AND f.feeMonth < :month))")
BigDecimal sumActiveOutstandingBeforeMonth(@Param("month") int month, @Param("year") int year);

}
