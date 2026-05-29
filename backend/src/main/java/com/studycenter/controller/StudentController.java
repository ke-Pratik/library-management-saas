package com.studycenter.controller;

import com.studycenter.dto.ActiveStudentsCountsResponse;
import com.studycenter.dto.ActiveStudentsPageResponse;
import com.studycenter.dto.DeactivateReactivateRequest;
import com.studycenter.dto.DeactivateReactivateResponse;
import com.studycenter.dto.StudentDetailResponse;
import com.studycenter.dto.StudentEditRequest;
import com.studycenter.dto.StudentEditResponse;
import com.studycenter.dto.StudentRegisterRequest;
import com.studycenter.dto.StudentRegisterResponse;
import com.studycenter.dto.StudentSummaryResponse;
import com.studycenter.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
@RequiredArgsConstructor
@Slf4j
public class StudentController {

    private final StudentService studentService;

    @PostMapping("/register")
    public ResponseEntity<StudentRegisterResponse> register(
            @Valid @RequestBody StudentRegisterRequest request) {
        return new ResponseEntity<>(studentService.registerStudent(request), HttpStatus.CREATED);
    }

    @PutMapping("/deactivate")
    public ResponseEntity<DeactivateReactivateResponse> deactivate(
            @Valid @RequestBody DeactivateReactivateRequest request) {
        return ResponseEntity.ok(studentService.deactivateStudent(request));
    }

    @PutMapping("/reactivate")
    public ResponseEntity<DeactivateReactivateResponse> reactivate(
            @Valid @RequestBody DeactivateReactivateRequest request) {
        return ResponseEntity.ok(studentService.reactivateStudent(request));
    }

    // ── Active students — paginated with optional filters ──
    @GetMapping("/active")
    public ResponseEntity<ActiveStudentsPageResponse> active(
            @RequestParam(defaultValue = "0")    int page,
            @RequestParam(defaultValue = "10")   int size,
            @RequestParam(defaultValue = "ALL")  String genderFilter,
            @RequestParam(defaultValue = "ALL")  String feeStatusFilter) {
        return ResponseEntity.ok(
                studentService.getActiveStudentsPaged(page, size, genderFilter, feeStatusFilter));
    }

    // ── NEW: filter pill counts ──
    @GetMapping("/active/counts")
    public ResponseEntity<ActiveStudentsCountsResponse> activeCounts() {
        return ResponseEntity.ok(studentService.getActiveStudentsFilterCounts());
    }

    @GetMapping("/inactive")
    public ResponseEntity<List<StudentDetailResponse>> inactive() {
        return ResponseEntity.ok(studentService.getInactiveStudents());
    }

    @GetMapping("/summary")
    public ResponseEntity<StudentSummaryResponse> summary() {
        return ResponseEntity.ok(studentService.getStudentSummary());
    }

    @GetMapping("/search")
    public ResponseEntity<List<StudentDetailResponse>> search(
            @RequestParam String type,
            @RequestParam String value) {
        return ResponseEntity.ok(studentService.searchStudents(type, value));
    }

    @GetMapping("/{regNo}")
    public ResponseEntity<StudentDetailResponse> getById(@PathVariable Long regNo) {
        return ResponseEntity.ok(studentService.getStudentById(regNo));
    }

    @PutMapping("/{regNo}")
    public ResponseEntity<StudentEditResponse> edit(
            @PathVariable Long regNo,
            @Valid @RequestBody StudentEditRequest request) {
        return ResponseEntity.ok(studentService.editStudent(regNo, request));
    }
}
