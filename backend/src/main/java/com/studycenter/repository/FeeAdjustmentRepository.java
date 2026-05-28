package com.studycenter.repository;

import com.studycenter.entity.FeeAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeeAdjustmentRepository extends JpaRepository<FeeAdjustment, Long> {
    List<FeeAdjustment> findByFeeIdOrderByAdjustedAtDesc(Long feeId);
    List<FeeAdjustment> findByRegNoOrderByAdjustedAtDesc(Long regNo);
}
