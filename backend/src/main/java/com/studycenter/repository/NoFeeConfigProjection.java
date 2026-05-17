package com.studycenter.repository;

import java.time.LocalDate;
import java.time.LocalTime;

// ── ENHANCEMENT #4: Projection for active students who have no StudentFeeConfig ─
// These students were registered before Enhancement #1 — fee was never locked
public interface NoFeeConfigProjection {
    Long getRegNo();
    String getName();
    String getMobile();
    LocalTime getInTime();
    LocalTime getOutTime();
    LocalDate getDateOfAdmission();
}
