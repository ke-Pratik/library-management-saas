package com.studycenter.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentEditResponse {

    private String  message;
    private Long    regNo;
    private String  name;
    private String  fatherName;
    private String  aadhaarNo;
    private String  gender;
    private String  address;
    private String  mobile;
    private String  inTime;
    private String  outTime;
    private String  dateOfAdmission;
    private String  remarks;
}
