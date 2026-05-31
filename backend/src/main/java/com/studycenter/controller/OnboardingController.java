package com.studycenter.controller;

import com.studycenter.dto.OnboardingRequest;
import com.studycenter.service.OnboardingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingService onboardingService;

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return onboardingService.status();
    }

    @PostMapping
    public Map<String, Boolean> complete(@RequestBody OnboardingRequest req) {
        return onboardingService.complete(req);
    }
}
