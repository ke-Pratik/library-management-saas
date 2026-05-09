package com.studycenter.repository;

import com.studycenter.entity.StudentFeeConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentFeeConfigRepository extends JpaRepository<StudentFeeConfig, Long> {

    // Get the currently active config for a student (effectiveToDate is null)
    Optional<StudentFeeConfig> findByRegNoAndEffectiveToDateIsNull(Long regNo);

    // Check if any config exists for a student (i.e. fee was ever locked)
    boolean existsByRegNo(Long regNo);
}
