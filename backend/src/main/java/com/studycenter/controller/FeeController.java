package com.studycenter.controller;

import com.studycenter.dto.AllStudentsFeeStatusResponse;
import com.studycenter.dto.BulkPaymentRequest;
import com.studycenter.dto.BulkPaymentResponse;
import com.studycenter.dto.FeeCalculateResponse;
import com.studycenter.dto.FeeCollectionResponse;
import com.studycenter.dto.FeeLockRequest;
import com.studycenter.dto.FeePaymentRequest;
import com.studycenter.dto.FeePaymentResponse;
import com.studycenter.dto.FeePreviewRequest;
import com.studycenter.dto.GenerateAllFeesResponse;
import com.studycenter.dto.NoConfigStudentsResponse;
import com.studycenter.dto.ReversePaymentRequest;
import com.studycenter.dto.ReversePaymentResponse;
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
import java.util.Map;

@RestController
@RequestMapping("/api/fees")
@RequiredArgsConstructor
@Slf4j
public class FeeController {

    private final FeeService feeService;

    @PostMapping("/preview")
    public ResponseEntity<FeeCalculateResponse> preview(@Valid @RequestBody FeePreviewRequest req) {
        return ResponseEntity.ok(feeService.previewFee(req));
    }

    @PostMapping("/lock")
    public ResponseEntity<FeeCalculateResponse> lock(@Valid @RequestBody FeeLockRequest req) {
        return new ResponseEntity<>(feeService.lockFee(req), HttpStatus.CREATED);
    }

    @PostMapping("/auto-generate/{regNo}")
    public ResponseEntity<?> autoGenerate(@PathVariable Long regNo) {
        FeeCalculateResponse result = feeService.autoGenerateCurrentMonthFee(regNo);
        if (result == null)
            return ResponseEntity.ok(Map.of("message", "Fee record already exists for current month."));
        return new ResponseEntity<>(result, HttpStatus.CREATED);
    }

    // ENHANCEMENT #2: Bulk generate fees for all active students
    @PostMapping("/generate-all")
    public ResponseEntity<GenerateAllFeesResponse> generateAll(
            @RequestParam Integer month, @RequestParam Integer year) {
        return new ResponseEntity<>(feeService.generateAllFeesForMonth(month, year), HttpStatus.CREATED);
    }

    @PostMapping("/pay")
    public ResponseEntity<FeePaymentResponse> pay(@Valid @RequestBody FeePaymentRequest req) {
        return ResponseEntity.ok(feeService.recordPayment(req));
    }

    @GetMapping("/student/{regNo}")
    public ResponseEntity<StudentFeeStatusResponse> studentFee(@PathVariable Long regNo) {
        return ResponseEntity.ok(feeService.getStudentFeeStatus(regNo));
    }

    // ENHANCEMENT #3: Now returns ALL active students including those with NO_RECORD
    @GetMapping("/status")
    public ResponseEntity<AllStudentsFeeStatusResponse> allStatus(
            @RequestParam Integer month, @RequestParam Integer year) {
        return ResponseEntity.ok(feeService.getAllStudentsFeeStatus(month, year));
    }

    // ENHANCEMENT #4: Active students who have no fee config (fee never locked)
    @GetMapping("/no-config")
    public ResponseEntity<NoConfigStudentsResponse> noConfig() {
        return ResponseEntity.ok(feeService.getStudentsWithNoConfig());
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

    // ENHANCEMENT #5: Bulk payment — process multiple students in one call
    // Entire batch is atomic: if one fails, all roll back
    @PostMapping("/bulk-payment")
    public ResponseEntity<BulkPaymentResponse> bulkPay(@Valid @RequestBody BulkPaymentRequest req) {
        return new ResponseEntity<>(feeService.bulkPayment(req), HttpStatus.CREATED);
    }

    // ENHANCEMENT #6: Reverse a payment — reset fee record back to PENDING
    @PostMapping("/reverse/{feeId}")
    public ResponseEntity<ReversePaymentResponse> reverse(
            @PathVariable Long feeId,
            @RequestBody(required = false) ReversePaymentRequest req) {
        String remarks = req != null ? req.getRemarks() : null;
        return ResponseEntity.ok(feeService.reversePayment(feeId, remarks));
    }

    // E7
    @GetMapping("/receipt/{receiptNumber}")
    public ResponseEntity<ReceiptResponse> getReceipt(
            @PathVariable String receiptNumber) {
        return ResponseEntity.ok(feeService.getReceipt(receiptNumber));
    }
}
