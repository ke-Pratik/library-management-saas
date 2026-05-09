package com.studycenter.controller;

import com.studycenter.dto.AllStudentsFeeStatusResponse;
import com.studycenter.dto.FeeCalculateResponse;
import com.studycenter.dto.FeeCollectionResponse;
import com.studycenter.dto.FeeLockRequest;
import com.studycenter.dto.FeePaymentRequest;
import com.studycenter.dto.FeePaymentResponse;
import com.studycenter.dto.FeePreviewRequest;
import com.studycenter.dto.StudentFeeStatusResponse;
import com.studycenter.service.FeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
@Slf4j
public class FeeController {

    private final FeeService feeService;

    @PostMapping("/preview")
    public ResponseEntity<FeeCalculateResponse> preview(
            @Valid @RequestBody FeePreviewRequest req) {
        return ResponseEntity.ok(feeService.previewFee(req));
    }

    @PostMapping("/lock")
    public ResponseEntity<FeeCalculateResponse> lock(
            @Valid @RequestBody FeeLockRequest req) {
        return new ResponseEntity<>(feeService.lockFee(req), HttpStatus.CREATED);
    }

     // Auto-generate current month fee record from saved config
    // Called by FeePayment page on student selection
    @PostMapping("/auto-generate/{regNo}")
    public ResponseEntity<?> autoGenerate(@PathVariable Long regNo) {
        FeeCalculateResponse result = feeService.autoGenerateCurrentMonthFee(regNo);
        if (result == null) {
            // Record already existed — not an error
            return ResponseEntity.ok(Map.of("message", "Fee record already exists for current month."));
        }
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    @PostMapping("/pay")
    public ResponseEntity<FeePaymentResponse> pay(
            @Valid @RequestBody FeePaymentRequest req) {
        return ResponseEntity.ok(feeService.recordPayment(req));
    }

    @GetMapping("/student/{regNo}")
    public ResponseEntity<StudentFeeStatusResponse> studentFee(@PathVariable Long regNo) {
        return ResponseEntity.ok(feeService.getStudentFeeStatus(regNo));
    }

    @GetMapping("/status")
    public ResponseEntity<AllStudentsFeeStatusResponse> allStatus(
            @RequestParam Integer month, @RequestParam Integer year) {
        return ResponseEntity.ok(feeService.getAllStudentsFeeStatus(month, year));
    }

    @GetMapping("/collection/monthly")
    public ResponseEntity<FeeCollectionResponse> monthly(
            @RequestParam Integer month, @RequestParam Integer year) {
        return ResponseEntity.ok(feeService.getMonthlyCollection(month, year));
    }

    @GetMapping("/collection/range")
    public ResponseEntity<FeeCollectionResponse> range(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        return ResponseEntity.ok(feeService.getCollectionByDateRange(startDate, endDate));
    }
}
