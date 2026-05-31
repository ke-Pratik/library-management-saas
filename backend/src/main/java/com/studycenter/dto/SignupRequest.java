package com.studycenter.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequest {
    @NotBlank private String libraryName;
    @NotBlank private String ownerName;
    @NotBlank @Email private String ownerEmail;
    @NotBlank private String ownerMobile;
    @NotBlank private String username;
    @NotBlank @Size(min = 6) private String password;
}
