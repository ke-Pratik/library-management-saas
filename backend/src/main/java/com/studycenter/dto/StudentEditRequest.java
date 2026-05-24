package com.studycenter.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentEditRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String fatherName;

    @NotBlank(message = "Aadhaar is required")
    @Pattern(regexp = "\\d{12}", message = "Aadhaar must be exactly 12 digits")
    private String aadhaarNo;

    @NotBlank(message = "Gender is required")
    private String gender;

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "Mobile is required")
    @Pattern(regexp = "\\d{10}", message = "Mobile must be exactly 10 digits")
    private String mobile;

    private String remarks;
}
