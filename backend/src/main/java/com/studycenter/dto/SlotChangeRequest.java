package com.studycenter.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SlotChangeRequest {
    @NotNull
    private Long regNo;
    @NotBlank
    private String newInTime;       // "HH:mm"
    @NotBlank
    private String newOutTime;      // "HH:mm"
    private BigDecimal newDiscount; // default 0
    private String reason;
    private String adminUser;
}
