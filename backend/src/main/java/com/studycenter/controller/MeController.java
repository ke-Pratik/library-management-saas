package com.studycenter.controller;

import com.studycenter.dto.MeProfileResponse;
import com.studycenter.dto.MeSubscriptionResponse;
import com.studycenter.service.MeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Self-service endpoints for the currently logged-in tenant user.
 * Auto-protected by the TenantJwtFilter — no SecurityConfig change needed.
 */
@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
public class MeController {

    private final MeService meService;

    @GetMapping
    public MeProfileResponse getProfile() {
        return meService.getProfile();
    }

    @GetMapping("/subscription")
    public MeSubscriptionResponse getSubscription() {
        return meService.getSubscription();
    }
}
