package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChangeSeatResponse {
    private String  message;
    private Long    regNo;
    private String  studentName;
    private Integer oldSeatNo;
    private Integer newSeatNo;
    private String  oldZone;
    private String  newZone;
    private String  timeSlot;
    private String  changedOn;
}
