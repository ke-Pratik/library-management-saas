package com.studycenter.service;

import com.studycenter.entity.Student;
import com.studycenter.entity.WalletTransaction;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.exception.StudentNotFoundException;
import com.studycenter.repository.StudentRepository;
import com.studycenter.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final StudentRepository           studentRepository;
    private final WalletTransactionRepository walletTxRepository;

    public enum TxType {
        CREDIT_FROM_RECALC, CREDIT_ADVANCE_PAYMENT,
        DEBIT_APPLIED_TO_FEE, DEBIT_REFUND_CASH
    }

    @Transactional
    public WalletTransaction credit(Long regNo, BigDecimal amount, TxType type,
                                    Long relatedFeeId, String reason, String user) {
        if (amount.signum() <= 0)
            throw new InvalidRequestException("Credit amount must be positive");

        Student s = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found"));

        BigDecimal newBalance = s.getWalletBalance().add(amount);
        s.setWalletBalance(newBalance);
        studentRepository.save(s);

        WalletTransaction tx = walletTxRepository.save(WalletTransaction.builder()
                .regNo(regNo).txType(type.name()).amount(amount)
                .relatedFeeId(relatedFeeId)
                .balanceAfter(newBalance).reason(reason).createdBy(user)
                .build());

        log.info("Wallet CREDIT: regNo={}, amount={}, type={}, newBalance={}", regNo, amount, type, newBalance);
        return tx;
    }

    @Transactional
    public WalletTransaction debit(Long regNo, BigDecimal amount, TxType type,
                                   Long relatedFeeId, String reason, String user) {
        if (amount.signum() <= 0)
            throw new InvalidRequestException("Debit amount must be positive");

        Student s = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found"));

        if (s.getWalletBalance().compareTo(amount) < 0)
            throw new InvalidRequestException(
                    "Insufficient wallet balance. Available: Rs." + s.getWalletBalance() + ", requested: Rs." + amount);

        BigDecimal newBalance = s.getWalletBalance().subtract(amount);
        s.setWalletBalance(newBalance);
        studentRepository.save(s);

        WalletTransaction tx = walletTxRepository.save(WalletTransaction.builder()
                .regNo(regNo).txType(type.name()).amount(amount)
                .relatedFeeId(relatedFeeId)
                .balanceAfter(newBalance).reason(reason).createdBy(user)
                .build());

        log.info("Wallet DEBIT: regNo={}, amount={}, type={}, newBalance={}", regNo, amount, type, newBalance);
        return tx;
    }

    public BigDecimal getBalance(Long regNo) {
        return studentRepository.findById(regNo)
                .map(Student::getWalletBalance)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found"));
    }

    public List<WalletTransaction> getTransactions(Long regNo) {
        return walletTxRepository.findByRegNoOrderByCreatedAtDesc(regNo);
    }

    @Transactional
    public WalletTransaction refundCash(Long regNo, BigDecimal amount, String reason, String user) {
        return debit(regNo, amount, TxType.DEBIT_REFUND_CASH, null,
                reason != null ? reason : "Cash refund to student", user);
    }
}
