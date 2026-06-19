package com.studycenter.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class MeProfileResponse {
    // Library
    private UUID tenantId;
    private String libraryName;

    // Owner
    private String ownerName;
    private String ownerEmail;
    private String ownerMobile;

    // Account
    private String username;
    private String role;
    private LocalDateTime memberSince;
}
