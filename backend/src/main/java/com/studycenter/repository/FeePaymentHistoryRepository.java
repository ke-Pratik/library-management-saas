package com.studycenter.repository;

import com.studycenter.entity.FeePaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface FeePaymentHistoryRepository extends JpaRepository<FeePaymentHistory, Long> {

    // ═══════════════════════════════════════════════════════════════════
    // DATE-RANGE based queries (for "Today" / custom range reports)
    // ═══════════════════════════════════════════════════════════════════

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM FeePaymentHistory p " +
           "WHERE p.paymentDate BETWEEN :start AND :end")
    BigDecimal sumAmountByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM FeePaymentHistory p " +
           "WHERE p.paymentDate BETWEEN :start AND :end AND p.paymentMode = :mode")
    BigDecimal sumAmountByDateRangeAndMode(@Param("start") LocalDate start,
                                            @Param("end") LocalDate end,
                                            @Param("mode") String mode);

    @Query("SELECT COUNT(p) FROM FeePaymentHistory p " +
           "WHERE p.paymentDate BETWEEN :start AND :end")
    long countByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COUNT(DISTINCT p.regNo) FROM FeePaymentHistory p " +
           "WHERE p.paymentDate BETWEEN :start AND :end")
    long countDistinctStudentsByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);


    // ═══════════════════════════════════════════════════════════════════
    // BILL-MONTH based (for monthly collection report)
    // "How much has been collected against bills FOR this month"
    // ═══════════════════════════════════════════════════════════════════

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM FeePaymentHistory p " +
           "WHERE p.feeId IN (SELECT f.feeId FROM FeeRecord f " +
           "                  WHERE f.feeMonth = :month AND f.feeYear = :year)")
    BigDecimal sumPaymentsForBillMonth(@Param("month") int month, @Param("year") int year);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM FeePaymentHistory p " +
           "WHERE p.paymentMode = :mode " +
           "AND p.feeId IN (SELECT f.feeId FROM FeeRecord f " +
           "                WHERE f.feeMonth = :month AND f.feeYear = :year)")
    BigDecimal sumPaymentsForBillMonthAndMode(@Param("month") int month,
                                                @Param("year") int year,
                                                @Param("mode") String mode);


    // ═══════════════════════════════════════════════════════════════════
    // BACKLOG: payments RECEIVED in this month for OLDER bills
    // ═══════════════════════════════════════════════════════════════════

    @Query(value = "SELECT COALESCE(SUM(p.amount), 0) FROM fee_payment_history p " +
                   "WHERE EXTRACT(MONTH FROM p.payment_date) = :month " +
                   "AND EXTRACT(YEAR FROM p.payment_date) = :year " +
                   "AND p.fee_id IN (SELECT f.fee_id FROM fee_records f " +
                   "                 WHERE f.fee_year < :year " +
                   "                 OR (f.fee_year = :year AND f.fee_month < :month))",
           nativeQuery = true)
    BigDecimal sumBacklogCollectedInMonth(@Param("month") int month, @Param("year") int year);


    // ═══════════════════════════════════════════════════════════════════
    // Per-record / per-student history
    // ═══════════════════════════════════════════════════════════════════

    List<FeePaymentHistory> findByFeeIdOrderByPaymentDateAscIdAsc(Long feeId);

    List<FeePaymentHistory> findByRegNoOrderByPaymentDateDescIdDesc(Long regNo);


    // ═══════════════════════════════════════════════════════════════════
    // For payment reversal — delete history entries for a fee record
    // ═══════════════════════════════════════════════════════════════════

    @Modifying
    @Query("DELETE FROM FeePaymentHistory p WHERE p.feeId = :feeId")
    void deleteByFeeId(@Param("feeId") Long feeId);
}
