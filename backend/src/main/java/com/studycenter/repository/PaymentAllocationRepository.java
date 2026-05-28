package com.studycenter.repository;

import com.studycenter.entity.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentAllocationRepository extends JpaRepository<PaymentAllocation, Long> {
    List<PaymentAllocation> findByPaymentId(String paymentId);
    List<PaymentAllocation> findByFeeId(Long feeId);
}
