package com.studycenter.controller;

import com.studycenter.dto.ResetPasswordRequest;
import com.studycenter.dto.ResetPasswordResponse;
import com.studycenter.dto.SysadminLoginRequest;
import com.studycenter.dto.SysadminLoginResponse;
import com.studycenter.dto.TenantPaymentRequest;
import com.studycenter.dto.TenantSummary;
import com.studycenter.entity.TenantPayment;
import com.studycenter.service.SysadminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sysadmin")
@RequiredArgsConstructor
public class SysadminController {

    private final SysadminService sysadminService;

    @PostMapping("/auth/login")
    public SysadminLoginResponse login(@RequestBody SysadminLoginRequest req) {
        return sysadminService.login(req);
    }

    @GetMapping("/tenants")
    public List<TenantSummary> tenants() {
        return sysadminService.listTenants();
    }

    @GetMapping("/tenants/{id}")
    public TenantSummary getTenant(@PathVariable("id") UUID id) {
        return sysadminService.getTenant(id);
    }

    @PostMapping("/tenants/{id}/active")
    public void setActive(@PathVariable("id") UUID id, @RequestBody Map<String, Boolean> body) {
        sysadminService.setActive(id, Boolean.TRUE.equals(body.get("active")));
    }

    @PostMapping("/tenants/{id}/payments")
    public TenantPayment recordPayment(@PathVariable("id") UUID id,
                                       @RequestBody TenantPaymentRequest req) {
        return sysadminService.recordPayment(id, req);
    }

    @GetMapping("/tenants/{id}/payments")
    public List<TenantPayment> payments(@PathVariable("id") UUID id) {
        return sysadminService.listPayments(id);
    }

    /** UPDATED: now accepts manual password from sysadmin */
    @PostMapping("/tenants/{id}/reset-password")
    public ResetPasswordResponse resetPassword(@PathVariable("id") UUID id,
                                               @Valid @RequestBody ResetPasswordRequest req) {
        return sysadminService.resetOwnerPassword(id, req.getNewPassword());
    }
}
