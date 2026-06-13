package com.studycenter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChangeSeatRequest {

    @NotNull(message = "regNo is required")
    private Long regNo;

    @NotNull(message = "newSeatNo is required")
    private Integer newSeatNo;
}
