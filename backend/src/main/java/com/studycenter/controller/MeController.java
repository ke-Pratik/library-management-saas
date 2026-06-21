package com.studycenter.controller;

import com.studycenter.dto.ChangePasswordRequest;
import com.studycenter.dto.MeProfileResponse;
import com.studycenter.dto.MeSubscriptionResponse;
import com.studycenter.service.MeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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

    /** NEW: logged-in user changes their own password */
    @PostMapping("/change-password")
    public Map<String, String> changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        meService.changePassword(req.getOldPassword(), req.getNewPassword());
        return Map.of("message", "Password updated successfully");
    }
}
