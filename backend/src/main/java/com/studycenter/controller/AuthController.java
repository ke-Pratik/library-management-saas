package com.studycenter.controller;

import com.studycenter.dto.LoginRequest;
import com.studycenter.dto.LoginResponse;
import com.studycenter.dto.SignupRequest;
import com.studycenter.dto.SignupResponse;
import com.studycenter.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/health")
    public String health() { return "OK"; }

    @PostMapping("/signup")
    public SignupResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
