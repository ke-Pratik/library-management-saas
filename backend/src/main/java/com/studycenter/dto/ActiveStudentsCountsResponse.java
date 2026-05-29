package com.studycenter.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActiveStudentsCountsResponse {
    private Long total;
    private Long maleCount;
    private Long femaleCount;
    private Long paidCount;
    private Long partialCount;
    private Long duesCount;
}
