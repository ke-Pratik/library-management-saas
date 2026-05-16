package com.studycenter.repository;

import java.time.LocalDate;
import java.time.LocalTime;

public interface ActiveStudentProjection {

    Long getRegNo();
    String getName();
    String getGender();
    String getMobile();
    Integer getSeatNo();
    LocalTime getInTime();
    LocalTime getOutTime();
    String getFeeStatus();
    LocalDate getDateOfAdmission();
}
