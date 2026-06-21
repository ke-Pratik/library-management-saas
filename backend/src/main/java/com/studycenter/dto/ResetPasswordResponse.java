package com.studycenter.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResetPasswordResponse {
    private String message;
    private String username;       // owner's username for sysadmin reference
}
