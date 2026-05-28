package com.studycenter.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "students")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @Column(name = "reg_no")
    private Long regNo;

    @Column(nullable = false)
    private String name;

    @Column(name = "father_name")
    private String fatherName;

    @Column(name = "aadhaar_no", nullable = false, unique = true)
    private String aadhaarNo;

    @Column(nullable = false)
    private String gender;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String mobile;

    @Column(name = "date_of_admission", nullable = false)
    private LocalDate dateOfAdmission;

    @Column(name = "in_time")
    private LocalTime inTime;

    @Column(name = "out_time")
    private LocalTime outTime;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "deactivation_date")
    private LocalDate deactivationDate;

    private String remarks;

    @Column(name = "wallet_balance", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal walletBalance = BigDecimal.ZERO;
}
