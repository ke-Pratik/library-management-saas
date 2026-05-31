package com.studycenter.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SignupResponse {
    private String token;
    private String tenantId;
    private String username;
    private String role;
    private String libraryName;
    private Boolean onboarded;
}
