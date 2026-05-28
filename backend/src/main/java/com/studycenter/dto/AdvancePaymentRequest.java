package com.studycenter.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AdvancePaymentRequest {

    @NotNull
    private Long regNo;
    @NotNull @DecimalMin("0.01")
    private BigDecimal totalAmount;
    @NotBlank
    private String paymentMode;        // CASH or ONLINE
    @NotNull @NotEmpty
    private List<MonthSpec> months;    // ordered: oldest first

    private boolean useWalletBalance;
    private String  remarks;
    private String  adminUser;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MonthSpec {
        @Min(1) @Max(12)
        private int month;
        @Min(2020) @Max(2100)
        private int year;
    }
}
