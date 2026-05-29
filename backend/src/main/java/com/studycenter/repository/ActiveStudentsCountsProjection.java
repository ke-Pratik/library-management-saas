package com.studycenter.repository;

public interface ActiveStudentsCountsProjection {
    Long getTotal();
    Long getMaleCount();
    Long getFemaleCount();
    Long getPaidCount();
    Long getPartialCount();
    Long getDuesCount();
}
