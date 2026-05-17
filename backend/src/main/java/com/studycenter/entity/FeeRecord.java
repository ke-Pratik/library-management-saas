package com.studycenter.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "fee_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "fee_id")
    private Long feeId;

    @Column(name = "reg_no", nullable = false)
    private Long regNo;

    // Links to the config that was active when this record was created
    @Column(name = "config_id")
    private Long configId;

    @Column(name = "fee_month", nullable = false)
    private Integer feeMonth;

    @Column(name = "fee_year", nullable = false)
    private Integer feeYear;

    @Column(name = "in_time", nullable = false)
    private LocalTime inTime;

    @Column(name = "out_time", nullable = false)
    private LocalTime outTime;

    @Column(name = "total_days_in_month")
    private Integer totalDaysInMonth;

    @Column(name = "applicable_days")
    private Integer applicableDays;

    @Column(name = "joining_date_in_month")
    private LocalDate joiningDateInMonth;

    @Column(name = "monthly_fee")
    private BigDecimal monthlyFee;

    @Column(name = "prorated_fee")
    private BigDecimal proratedFee;

    // One-time admission fee — only > 0 for the very first month record
    @Column(name = "admission_fee")
    private BigDecimal admissionFee;

    @Column(name = "discount_amount")
    private BigDecimal discountAmount;

    // final_fee = proratedFee + admissionFee - discountAmount
    @Column(name = "final_fee")
    private BigDecimal finalFee;

    @Column(name = "paid_amount")
    private BigDecimal paidAmount;

    @Column(name = "balance_amount")
    private BigDecimal balanceAmount;

    @Column(name = "payment_status")
    private String paymentStatus; // PENDING / PARTIAL / PAID

    @Column(name = "payment_mode")
    private String paymentMode; // CASH / ONLINE

    @Column(name = "payment_date")
    private LocalDate paymentDate;

    @Column(name = "receipt_number")
    private String receiptNumber;

    @Column(name = "remarks")
    private String remarks;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
