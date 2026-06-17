package com.studycenter.repository;

import com.studycenter.entity.FeeStructure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeeStructureRepository extends JpaRepository<FeeStructure, Long> {

    Optional<FeeStructure> findByInTimeAndOutTimeAndIsActiveTrue(LocalTime inTime, LocalTime outTime);

    void deleteByTenantId(UUID tenantId);
}
