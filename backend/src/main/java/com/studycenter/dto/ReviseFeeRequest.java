package com.studycenter.dto;

import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ReviseFeeRequest {
    private BigDecimal newDiscount;        // optional — null = keep existing
    private BigDecimal newAdmissionFee;    // optional — null = keep existing
    private String     reason;
    private String     adminUser;
}
