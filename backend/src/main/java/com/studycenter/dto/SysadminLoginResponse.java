package com.studycenter.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SysadminLoginResponse {
    private String token;
    private String username;
}
