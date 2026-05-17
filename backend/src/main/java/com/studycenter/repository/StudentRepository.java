package com.studycenter.repository;

import com.studycenter.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    List<Student> findByIsActiveTrue();
    List<Student> findByIsActiveFalse();
    boolean existsByAadhaarNo(String aadhaarNo);
    long countByIsActiveTrue();
    long countByIsActiveFalse();

    @Query("SELECT s FROM Student s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%')) ORDER BY s.name ASC")
    List<Student> searchByName(@Param("name") String name);

    @Query("SELECT s FROM Student s WHERE s.isActive = true AND s.regNo = :regNo")
    List<Student> searchActiveByRegNo(@Param("regNo") Long regNo);

    @Query("SELECT s FROM Student s WHERE s.isActive = true AND LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%')) ORDER BY s.name ASC")
    List<Student> searchActiveByName(@Param("name") String name);

    @Query("SELECT s FROM Student s WHERE s.isActive = true AND s.mobile LIKE CONCAT('%', :mobile, '%') ORDER BY s.name ASC")
    List<Student> searchActiveByMobile(@Param("mobile") String mobile);

    // Existing query — Active Students page with seat + fee status
    @Query(
            value = "SELECT " +
                    "  s.reg_no        AS regNo, " +
                    "  s.name          AS name, " +
                    "  s.gender        AS gender, " +
                    "  s.mobile        AS mobile, " +
                    "  COALESCE( " +
                    "    (SELECT sb.seat_no FROM seat_bookings sb " +
                    "     WHERE sb.reg_no = s.reg_no " +
                    "     ORDER BY sb.seat_no ASC LIMIT 1), " +
                    "    0) AS seatNo, " +
                    "  s.in_time       AS inTime, " +
                    "  s.out_time      AS outTime, " +
                    "  CASE " +
                    "    WHEN EXISTS ( " +
                    "      SELECT 1 FROM fee_records fr " +
                    "      WHERE fr.reg_no = s.reg_no " +
                    "      AND fr.fee_month = :month AND fr.fee_year = :year " +
                    "    ) " +
                    "    THEN " +
                    "      CASE " +
                    "        WHEN ( " +
                    "          SELECT fr.balance_amount FROM fee_records fr " +
                    "          WHERE fr.reg_no = s.reg_no " +
                    "          AND fr.fee_month = :month AND fr.fee_year = :year " +
                    "          ORDER BY fr.fee_id DESC LIMIT 1 " +
                    "        ) > 0 " +
                    "        THEN 'DUES' " +
                    "        ELSE 'PAID' " +
                    "      END " +
                    "    ELSE 'DUES' " +
                    "  END AS feeStatus, " +
                    "  s.date_of_admission AS dateOfAdmission " +
                    "FROM students s " +
                    "WHERE s.is_active = true " +
                    "ORDER BY s.reg_no ASC",
            countQuery = "SELECT COUNT(*) FROM students WHERE is_active = true",
            nativeQuery = true
    )
    Page<ActiveStudentProjection> findActiveStudentsWithDetails(
            @Param("month") int month,
            @Param("year") int year,
            Pageable pageable);

    // ── ENHANCEMENT #3: LEFT JOIN all active students with fee_records ────────
    // Returns all active students — fee columns are NULL when no record exists.
    // Database does the join. DB-agnostic: plain LEFT JOIN works on MySQL + PostgreSQL.
    @Query(
            value = "SELECT " +
                    "  s.reg_no            AS regNo, " +
                    "  s.name              AS name, " +
                    "  s.in_time           AS inTime, " +
                    "  s.out_time          AS outTime, " +
                    "  fr.final_fee        AS finalFee, " +
                    "  fr.paid_amount      AS paidAmount, " +
                    "  fr.balance_amount   AS balanceAmount, " +
                    "  fr.payment_status   AS paymentStatus, " +
                    "  fr.payment_mode     AS paymentMode, " +
                    "  fr.receipt_number   AS receiptNumber " +
                    "FROM students s " +
                    "LEFT JOIN fee_records fr " +
                    "  ON s.reg_no = fr.reg_no " +
                    "  AND fr.fee_month = :month " +
                    "  AND fr.fee_year  = :year " +
                    "WHERE s.is_active = true " +
                    "ORDER BY s.reg_no ASC",
            nativeQuery = true
    )
    List<AllStudentFeeProjection> findAllStudentsFeeStatus(
            @Param("month") int month,
            @Param("year") int year);
    // ── END ENHANCEMENT #3 ───────────────────────────────────────────────────

    // ── ENHANCEMENT #4: LEFT JOIN active students with student_fee_config ─────
    // Returns only students who have NO active config (effective_to_date IS NULL).
    // These students were registered before Enhancement #1 — need manual fee lock.
    @Query(
            value = "SELECT " +
                    "  s.reg_no             AS regNo, " +
                    "  s.name               AS name, " +
                    "  s.mobile             AS mobile, " +
                    "  s.in_time            AS inTime, " +
                    "  s.out_time           AS outTime, " +
                    "  s.date_of_admission  AS dateOfAdmission " +
                    "FROM students s " +
                    "LEFT JOIN student_fee_config sfc " +
                    "  ON s.reg_no = sfc.reg_no " +
                    "  AND sfc.effective_to_date IS NULL " +
                    "WHERE s.is_active = true " +
                    "  AND sfc.config_id IS NULL " +
                    "ORDER BY s.reg_no ASC",
            nativeQuery = true
    )
    List<NoFeeConfigProjection> findActiveStudentsWithNoConfig();
    // ── END ENHANCEMENT #4 ───────────────────────────────────────────────────
}
