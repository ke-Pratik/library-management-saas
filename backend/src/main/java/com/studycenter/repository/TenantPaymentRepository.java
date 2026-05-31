package com.studycenter.repository;

import com.studycenter.entity.TenantPayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TenantPaymentRepository extends JpaRepository<TenantPayment, Long> {
    List<TenantPayment> findByTenantIdOrderByPaidOnDesc(UUID tenantId);
}
