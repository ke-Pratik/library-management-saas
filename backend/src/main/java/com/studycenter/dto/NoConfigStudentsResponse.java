package com.studycenter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// ── ENHANCEMENT #4: Response for GET /fees/no-config ─────────────────────────
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoConfigStudentsResponse {

    private int count;
    private String message;
    private List<StudentInfo> students;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentInfo {
        private Long regNo;
        private String name;
        private String mobile;
        private String timeSlot;        // from student's in_time / out_time
        private String dateOfAdmission;
    }
}
