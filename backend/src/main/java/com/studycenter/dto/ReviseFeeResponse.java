package com.studycenter.dto;

import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ReviseFeeResponse {
    private String     message;
    private Long       feeId;
    private Long       regNo;
    private BigDecimal oldFinalFee;
    private BigDecimal newFinalFee;
    private BigDecimal oldBalance;
    private BigDecimal newBalance;
    private String     oldStatus;
    private String     newStatus;
    private BigDecimal walletCreditAdded;   // when overpaid
    private String     overpaidNote;
}
