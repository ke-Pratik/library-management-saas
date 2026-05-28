package com.studycenter.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SlotChangeResponse {
    private String     message;
    private Long       feeId;
    private Long       regNo;
    private Integer    changeDay;
    private Integer    oldDays;
    private Integer    newDays;
    private BigDecimal oldUsedFee;
    private BigDecimal newRemainingFee;
    private BigDecimal admissionFee;
    private BigDecimal revisedFinalFee;
    private BigDecimal paidAmount;
    private BigDecimal newBalance;
    private String     newStatus;
    private BigDecimal walletCreditAdded;
    private String     overpaidNote;
    private Integer    assignedSeatNo;     // null = manual re-allot needed
    private List<String> previousDuesWarning;
}
