package com.studycenter.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studycenter.entity.FeeAdjustment;
import com.studycenter.entity.FeeRecord;
import com.studycenter.repository.FeeAdjustmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdjustmentService {

    private final FeeAdjustmentRepository repo;
    private final ObjectMapper            mapper = new ObjectMapper();

    public enum Type { DISCOUNT_REVISED, ADMISSION_REVISED, SLOT_CHANGED, MANUAL_REVERSAL }

    public Map<String, Object> snapshot(FeeRecord fr) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("monthlyFee",      fr.getMonthlyFee());
        m.put("proratedFee",     fr.getProratedFee());
        m.put("discountAmount",  fr.getDiscountAmount());
        m.put("admissionFee",    fr.getAdmissionFee());
        m.put("finalFee",        fr.getFinalFee());
        m.put("paidAmount",      fr.getPaidAmount());
        m.put("balanceAmount",   fr.getBalanceAmount());
        m.put("paymentStatus",   fr.getPaymentStatus());
        m.put("inTime",          fr.getInTime()  != null ? fr.getInTime().toString()  : null);
        m.put("outTime",         fr.getOutTime() != null ? fr.getOutTime().toString() : null);
        m.put("applicableDays",  fr.getApplicableDays());
        return m;
    }

    public void persist(FeeRecord fr, Type type, Map<String,Object> oldVals,
                        Map<String,Object> newVals, String reason, String user) {
        try {
            BigDecimal oldFinal = (BigDecimal) oldVals.get("finalFee");
            BigDecimal newFinal = (BigDecimal) newVals.get("finalFee");
            BigDecimal delta    = newFinal.subtract(oldFinal);

            repo.save(FeeAdjustment.builder()
                    .feeId(fr.getFeeId()).regNo(fr.getRegNo())
                    .adjustmentType(type.name())
                    .oldValues(mapper.writeValueAsString(oldVals))
                    .newValues(mapper.writeValueAsString(newVals))
                    .deltaAmount(delta)
                    .reason(reason).adjustedBy(user)
                    .build());
            log.info("Audit row written: feeId={}, type={}, delta={}", fr.getFeeId(), type, delta);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize adjustment JSON", e);
            throw new RuntimeException("Failed to persist adjustment", e);
        }
    }

    public List<FeeAdjustment> getForFee(Long feeId) {
        return repo.findByFeeIdOrderByAdjustedAtDesc(feeId);
    }

    public List<FeeAdjustment> getForStudent(Long regNo) {
        return repo.findByRegNoOrderByAdjustedAtDesc(regNo);
    }
}
