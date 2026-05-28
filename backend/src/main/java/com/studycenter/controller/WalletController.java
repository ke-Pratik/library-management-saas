package com.studycenter.controller;

import com.studycenter.entity.WalletTransaction;
import com.studycenter.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/students/{regNo}/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<Map<String,Object>> getWallet(@PathVariable Long regNo) {
        return ResponseEntity.ok(Map.of(
                "regNo",   regNo,
                "balance", walletService.getBalance(regNo)
        ));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<WalletTransaction>> getTransactions(@PathVariable Long regNo) {
        return ResponseEntity.ok(walletService.getTransactions(regNo));
    }

    @PostMapping("/refund-cash")
    public ResponseEntity<WalletTransaction> refundCash(
            @PathVariable Long regNo,
            @RequestBody Map<String,Object> body) {
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        String reason     = (String) body.getOrDefault("reason", "Cash refund");
        String user       = (String) body.getOrDefault("user", "admin");
        return ResponseEntity.ok(walletService.refundCash(regNo, amount, reason, user));
    }
}
