package com.studycenter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeactivateReactivateRequest {

    @NotNull(message = "regNo is required")
    private Long regNo;

    private String remarks;

    // ── NEW deactivation fields ──

    /** Last day the student actually used the library. Defaults to today if null. */
    private LocalDate lastActiveDate;

    /** TRUE if student joined but never used the library — current month fee record will be DELETED. */
    private Boolean neverUsed;

    /** How to handle current month fee record. "PRORATE" or "WAIVE". Ignored if neverUsed=true. */
    private String feeHandling;

    /** When PRORATE leaves a balance: "COLLECT" or "WAIVE". */
    private String balanceAction;

    /** Payment mode if balanceAction = COLLECT. "CASH" or "ONLINE". */
    private String collectMode;
}
