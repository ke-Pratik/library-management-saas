package com.studycenter.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotChangePreviewResponse {
    // ── Fee impact (this month) ──
    private Integer changeDay;
    private Integer oldDays;
    private Integer newDays;
    private BigDecimal oldUsedFee;
    private BigDecimal newRemainingFee;
    private BigDecimal admissionFee;
    private BigDecimal revisedFinalFee;
    private BigDecimal paidAmount;
    private BigDecimal newBalance;
    private String     newStatus;
    private BigDecimal walletCreditAdded;
    private String     overpaidNote;

    // ── Next month preview ──
    private String     newInTime;
    private String     newOutTime;
    private BigDecimal newMonthlyFee;
    private BigDecimal newMonthlyDiscount;
    private BigDecimal nextMonthFee;

    // ── Seat selection helpers ──
    private Integer       currentSeatNo;          // student's current seat (or null)
    private Boolean       currentSeatAvailableInNewSlot;
    private List<Integer> availableSeatsInNewSlot;

    // ── Previous unpaid dues ──
    private List<String> previousDuesWarning;
}
