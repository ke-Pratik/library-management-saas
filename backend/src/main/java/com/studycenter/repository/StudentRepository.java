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
    boolean existsByAadhaarNoAndRegNoNot(String aadhaarNo, Long regNo);
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

    @Query(
        value = "SELECT * FROM ( " +
                "  SELECT " +
                "    s.reg_no            AS regNo, " +
                "    s.name              AS name, " +
                "    s.gender            AS gender, " +
                "    s.mobile            AS mobile, " +
                "    COALESCE( " +
                "      (SELECT sb.seat_no FROM seat_bookings sb " +
                "       WHERE sb.reg_no = s.reg_no " +
                "       ORDER BY sb.seat_no ASC LIMIT 1), " +
                "      0) AS seatNo, " +
                "    s.in_time           AS inTime, " +
                "    s.out_time          AS outTime, " +
                "    CASE " +
                "      WHEN EXISTS ( " +
                "        SELECT 1 FROM fee_records fr " +
                "        WHERE fr.reg_no = s.reg_no " +
                "        AND fr.fee_month = :month AND fr.fee_year = :year " +
                "      ) " +
                "      THEN ( " +
                "        SELECT fr.payment_status FROM fee_records fr " +
                "        WHERE fr.reg_no = s.reg_no " +
                "        AND fr.fee_month = :month AND fr.fee_year = :year " +
                "        ORDER BY fr.fee_id DESC LIMIT 1 " +
                "      ) " +
                "      ELSE 'DUES' " +
                "    END AS feeStatus, " +
                "    s.date_of_admission AS dateOfAdmission " +
                "  FROM students s " +
                "  WHERE s.is_active = true " +
                ") AS sub " +
                "WHERE (:genderFilter = 'ALL' OR sub.gender = :genderFilter) " +
                "  AND ( " +
                "    :feeStatusFilter = 'ALL' " +
                "    OR sub.feeStatus = :feeStatusFilter " +
                "    OR (:feeStatusFilter = 'DUES' AND sub.feeStatus IN ('PENDING', 'DUES')) " +
                "  )",
        countQuery =
                "SELECT COUNT(*) FROM ( " +
                "  SELECT " +
                "    s.gender AS gender, " +
                "    CASE " +
                "      WHEN EXISTS ( " +
                "        SELECT 1 FROM fee_records fr " +
                "        WHERE fr.reg_no = s.reg_no " +
                "        AND fr.fee_month = :month AND fr.fee_year = :year " +
                "      ) " +
                "      THEN ( " +
                "        SELECT fr.payment_status FROM fee_records fr " +
                "        WHERE fr.reg_no = s.reg_no " +
                "        AND fr.fee_month = :month AND fr.fee_year = :year " +
                "        ORDER BY fr.fee_id DESC LIMIT 1 " +
                "      ) " +
                "      ELSE 'DUES' " +
                "    END AS feeStatus " +
                "  FROM students s " +
                "  WHERE s.is_active = true " +
                ") AS sub " +
                "WHERE (:genderFilter = 'ALL' OR sub.gender = :genderFilter) " +
                "  AND ( " +
                "    :feeStatusFilter = 'ALL' " +
                "    OR sub.feeStatus = :feeStatusFilter " +
                "    OR (:feeStatusFilter = 'DUES' AND sub.feeStatus IN ('PENDING', 'DUES')) " +
                "  )",
        nativeQuery = true
    )
    Page<ActiveStudentProjection> findActiveStudentsWithDetails(
            @Param("month") int month,
            @Param("year") int year,
            @Param("genderFilter") String genderFilter,
            @Param("feeStatusFilter") String feeStatusFilter,
            Pageable pageable);

    @Query(
        value = "SELECT " +
                "  COUNT(*) AS total, " +
                "  SUM(CASE WHEN sub.gender = 'Male'   THEN 1 ELSE 0 END) AS maleCount, " +
                "  SUM(CASE WHEN sub.gender = 'Female' THEN 1 ELSE 0 END) AS femaleCount, " +
                "  SUM(CASE WHEN sub.feeStatus = 'PAID'    THEN 1 ELSE 0 END) AS paidCount, " +
                "  SUM(CASE WHEN sub.feeStatus = 'PARTIAL' THEN 1 ELSE 0 END) AS partialCount, " +
                "  SUM(CASE WHEN sub.feeStatus IN ('PENDING', 'DUES') THEN 1 ELSE 0 END) AS duesCount " +
                "FROM ( " +
                "  SELECT " +
                "    s.gender AS gender, " +
                "    CASE " +
                "      WHEN EXISTS ( " +
                "        SELECT 1 FROM fee_records fr " +
                "        WHERE fr.reg_no = s.reg_no " +
                "        AND fr.fee_month = :month AND fr.fee_year = :year " +
                "      ) " +
                "      THEN ( " +
                "        SELECT fr.payment_status FROM fee_records fr " +
                "        WHERE fr.reg_no = s.reg_no " +
                "        AND fr.fee_month = :month AND fr.fee_year = :year " +
                "        ORDER BY fr.fee_id DESC LIMIT 1 " +
                "      ) " +
                "      ELSE 'DUES' " +
                "    END AS feeStatus " +
                "  FROM students s " +
                "  WHERE s.is_active = true " +
                ") AS sub",
        nativeQuery = true
    )
    ActiveStudentsCountsProjection getActiveStudentsCounts(
            @Param("month") int month,
            @Param("year") int year);

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
}
