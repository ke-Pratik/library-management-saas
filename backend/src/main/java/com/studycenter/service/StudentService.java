package com.studycenter.service;

import com.studycenter.dto.ActiveStudentDto;
import com.studycenter.dto.ActiveStudentsCountsResponse;
import com.studycenter.dto.ActiveStudentsPageResponse;
import com.studycenter.dto.DeactivateReactivateRequest;
import com.studycenter.dto.DeactivateReactivateResponse;
import com.studycenter.dto.FeeCalculateResponse;
import com.studycenter.dto.FeeLockRequest;
import com.studycenter.dto.StudentDetailResponse;
import com.studycenter.dto.StudentEditRequest;
import com.studycenter.dto.StudentEditResponse;
import com.studycenter.dto.StudentRegisterRequest;
import com.studycenter.dto.StudentRegisterResponse;
import com.studycenter.dto.StudentSummaryResponse;
import com.studycenter.entity.Student;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.exception.StudentNotFoundException;
import com.studycenter.repository.ActiveStudentProjection;
import com.studycenter.repository.ActiveStudentsCountsProjection;
import com.studycenter.repository.SeatBookingRepository;
import com.studycenter.repository.StudentRepository;
import com.studycenter.tenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class StudentService {

    private final StudentRepository     studentRepository;
    private final SeatBookingRepository seatBookingRepository;
    private final FeeService            feeService;
    private final JdbcTemplate          jdbc;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    @Transactional
    public StudentRegisterResponse registerStudent(StudentRegisterRequest request) {

        // ── Auto-generate reg_no atomically ──────────────────────────────
        UUID tenantId = TenantContext.requireTenantId();
        Long regNo = jdbc.queryForObject(
                "UPDATE tenant_settings " +
                "SET next_reg_no = next_reg_no + 1 " +
                "WHERE tenant_id = ?::uuid " +
                "RETURNING next_reg_no - 1",
                Long.class,
                tenantId.toString()
        );

        if (regNo == null) {
            throw new InvalidRequestException(
                    "Tenant settings not found. Please complete onboarding first.");
        }

        log.info("Registering: autoRegNo={}, name={}", regNo, request.getName());

        // Aadhaar uniqueness check
        if (studentRepository.existsByAadhaarNo(request.getAadhaarNo()))
            throw new InvalidRequestException(
                    "Aadhaar " + request.getAadhaarNo() + " is already registered.");

        LocalDate admissionDate = LocalDate.parse(request.getDateOfAdmission());
        if (request.getInTime() == null || request.getInTime().isEmpty())
            throw new InvalidRequestException("inTime is required");
        if (request.getOutTime() == null || request.getOutTime().isEmpty())
            throw new InvalidRequestException("outTime is required");

        LocalTime inTime  = LocalTime.parse(request.getInTime());
        LocalTime outTime = LocalTime.parse(request.getOutTime());

        if (!inTime.isBefore(outTime))
            throw new InvalidRequestException("inTime must be before outTime");

        Student student = Student.builder()
                .regNo(regNo)
                .name(request.getName())
                .fatherName(request.getFatherName())
                .aadhaarNo(request.getAadhaarNo())
                .gender(request.getGender())
                .address(request.getAddress())
                .mobile(request.getMobile())
                .dateOfAdmission(admissionDate)
                .inTime(inTime)
                .outTime(outTime)
                .isActive(true)
                .build();

        studentRepository.save(student);

        FeeLockRequest feeLockRequest = FeeLockRequest.builder()
                .regNo(regNo)
                .inTime(request.getInTime())
                .outTime(request.getOutTime())
                .joiningDate(admissionDate)
                .admissionFee(request.getAdmissionFee()    != null ? request.getAdmissionFee()    : BigDecimal.ZERO)
                .discountAmount(request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO)
                .remarks(request.getRemarks())
                .build();

        FeeCalculateResponse feeResult = feeService.lockFee(feeLockRequest);

        return StudentRegisterResponse.builder()
                .message("Student registered and fee locked successfully!")
                .regNo(regNo)
                .name(request.getName())
                .gender(request.getGender())
                .dateOfAdmission(request.getDateOfAdmission())
                .inTime(inTime.format(TIME_FMT))
                .outTime(outTime.format(TIME_FMT))
                .feeId(feeResult.getFeeId())
                .timeSlot(feeResult.getTimeSlot())
                .monthlyFee(feeResult.getMonthlyFee())
                .proratedFee(feeResult.getProratedFee())
                .admissionFee(feeResult.getAdmissionFee())
                .discountAmount(feeResult.getDiscountAmount())
                .finalFee(feeResult.getFinalFee())
                .feeMonth(feeResult.getFeeMonth())
                .feeYear(feeResult.getFeeYear())
                .nextMonthFee(feeResult.getNextMonthFee())
                .nextMonthMessage(feeResult.getNextMonthMessage())
                .build();
    }

    @Transactional
    public DeactivateReactivateResponse deactivateStudent(DeactivateReactivateRequest request) {
        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException("Student " + request.getRegNo() + " not found."));
        if (!student.getIsActive())
            throw new InvalidRequestException("Student " + request.getRegNo() + " is already inactive.");

        student.setIsActive(false);
        student.setDeactivationDate(LocalDate.now());
        student.setRemarks(request.getRemarks());
        studentRepository.save(student);

        long cancelled = seatBookingRepository.countByRegNo(request.getRegNo());
        seatBookingRepository.deleteByRegNo(request.getRegNo());

        return DeactivateReactivateResponse.builder()
                .message("Student deactivated successfully!")
                .regNo(request.getRegNo())
                .name(student.getName())
                .isActive(false)
                .deactivationDate(LocalDate.now().toString())
                .remarks(request.getRemarks())
                .bookingsCancelled((int) cancelled)
                .build();
    }

    @Transactional
    public DeactivateReactivateResponse reactivateStudent(DeactivateReactivateRequest request) {
        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException("Student " + request.getRegNo() + " not found."));
        if (student.getIsActive())
            throw new InvalidRequestException("Student " + request.getRegNo() + " is already active.");

        student.setIsActive(true);
        student.setDeactivationDate(null);
        student.setRemarks(request.getRemarks());
        studentRepository.save(student);

        return DeactivateReactivateResponse.builder()
                .message("Student reactivated successfully!")
                .regNo(request.getRegNo())
                .name(student.getName())
                .isActive(true)
                .remarks(request.getRemarks())
                .bookingsCancelled(0)
                .build();
    }

    public StudentDetailResponse getStudentById(Long regNo) {
        Student student = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found."));
        return toDetailResponse(student);
    }

    @Transactional
    public StudentEditResponse editStudent(Long regNo, StudentEditRequest request) {
        Student student = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found."));

        if (!student.getIsActive())
            throw new InvalidRequestException("Cannot edit inactive student " + regNo + ". Reactivate first.");

        if (studentRepository.existsByAadhaarNoAndRegNoNot(request.getAadhaarNo(), regNo))
            throw new InvalidRequestException(
                    "Aadhaar " + request.getAadhaarNo() + " is already registered to another student.");

        student.setName(request.getName());
        student.setFatherName(request.getFatherName());
        student.setAadhaarNo(request.getAadhaarNo());
        student.setGender(request.getGender());
        student.setAddress(request.getAddress());
        student.setMobile(request.getMobile());
        student.setRemarks(request.getRemarks());
        studentRepository.save(student);

        return StudentEditResponse.builder()
                .message("Student details updated successfully.")
                .regNo(regNo)
                .name(student.getName())
                .fatherName(student.getFatherName())
                .aadhaarNo(student.getAadhaarNo())
                .gender(student.getGender())
                .address(student.getAddress())
                .mobile(student.getMobile())
                .inTime(student.getInTime()  != null ? student.getInTime().format(TIME_FMT)  : null)
                .outTime(student.getOutTime() != null ? student.getOutTime().format(TIME_FMT) : null)
                .dateOfAdmission(student.getDateOfAdmission() != null ? student.getDateOfAdmission().toString() : null)
                .remarks(student.getRemarks())
                .build();
    }

    public List<StudentDetailResponse> getActiveStudents() {
        return studentRepository.findByIsActiveTrue().stream().map(this::toDetailResponse).toList();
    }

    public List<StudentDetailResponse> getInactiveStudents() {
        return studentRepository.findByIsActiveFalse().stream().map(this::toDetailResponse).toList();
    }

    public StudentSummaryResponse getStudentSummary() {
        long active   = studentRepository.countByIsActiveTrue();
        long inactive = studentRepository.countByIsActiveFalse();
        return StudentSummaryResponse.builder()
                .totalStudents(active + inactive)
                .activeStudents(active)
                .inactiveStudents(inactive)
                .build();
    }

    public List<StudentDetailResponse> searchStudents(String type, String value) {
        if (type  == null || type.trim().isEmpty())  throw new InvalidRequestException("Search type cannot be empty.");
        if (value == null || value.trim().isEmpty()) throw new InvalidRequestException("Search value cannot be empty.");

        String searchType  = type.trim().toLowerCase();
        String searchValue = value.trim();
        List<Student> students;

        switch (searchType) {
            case "regno" -> {
                try { students = studentRepository.searchActiveByRegNo(Long.parseLong(searchValue)); }
                catch (NumberFormatException ex) { throw new InvalidRequestException("Reg No must be a valid number."); }
            }
            case "mobile" -> students = studentRepository.searchActiveByMobile(searchValue);
            case "name"   -> students = studentRepository.searchActiveByName(searchValue);
            default -> throw new InvalidRequestException("Invalid search type. Use regNo, mobile, or name.");
        }
        return students.stream().map(this::toDetailResponse).toList();
    }

    public List<StudentDetailResponse> searchByName(String name) {
        if (name == null || name.trim().isEmpty()) throw new InvalidRequestException("Search name cannot be empty.");
        return studentRepository.searchByName(name.trim()).stream().map(this::toDetailResponse).toList();
    }

    private StudentDetailResponse toDetailResponse(Student s) {
        return StudentDetailResponse.builder()
                .regNo(s.getRegNo())
                .name(s.getName()).fatherName(s.getFatherName())
                .gender(s.getGender()).mobile(s.getMobile())
                .address(s.getAddress()).aadhaarNo(s.getAadhaarNo())
                .dateOfAdmission(s.getDateOfAdmission() != null ? s.getDateOfAdmission().toString() : null)
                .inTime(s.getInTime()  != null ? s.getInTime().format(TIME_FMT)  : null)
                .outTime(s.getOutTime() != null ? s.getOutTime().format(TIME_FMT) : null)
                .isActive(s.getIsActive())
                .deactivationDate(s.getDeactivationDate() != null ? s.getDeactivationDate().toString() : null)
                .remarks(s.getRemarks())
                .build();
    }

    public ActiveStudentsPageResponse getActiveStudentsPaged(int page, int size,
                                                              String genderFilter,
                                                              String feeStatusFilter,
                                                              String sortBy,
                                                              String sortOrder) {
        LocalDate today = LocalDate.now();

        String gender = (genderFilter == null || genderFilter.isBlank()) ? "ALL" : genderFilter;
        String feeSt  = (feeStatusFilter == null || feeStatusFilter.isBlank()) ? "ALL" : feeStatusFilter.toUpperCase();

        // Whitelist sort column — only "seatNo" or "regNo" allowed (security: prevents injection)
        String sortColumn    = "seatNo".equalsIgnoreCase(sortBy) ? "seatNo" : "regNo";
        String sortDirection = "desc".equalsIgnoreCase(sortOrder) ? "desc" : "asc";

        // Pass PageRequest WITHOUT Sort — Spring Data only adds LIMIT/OFFSET.
        // The ORDER BY CASE WHEN is embedded directly in the @Query SQL.
        Pageable pageable = PageRequest.of(page, size);

        Page<ActiveStudentProjection> result = studentRepository
                .findActiveStudentsWithDetails(
                        today.getMonthValue(), today.getYear(),
                        gender, feeSt,
                        sortColumn, sortDirection,
                        pageable);

        return ActiveStudentsPageResponse.builder()
                .students(result.getContent().stream().map(this::mapProjectionToDto).toList())
                .page(result.getNumber()).size(result.getSize())
                .totalElements(result.getTotalElements()).totalPages(result.getTotalPages())
                .build();
    }

    public ActiveStudentsCountsResponse getActiveStudentsFilterCounts() {
        LocalDate today = LocalDate.now();
        ActiveStudentsCountsProjection p = studentRepository.getActiveStudentsCounts(
                today.getMonthValue(), today.getYear());

        return ActiveStudentsCountsResponse.builder()
                .total(p.getTotal())
                .maleCount(p.getMaleCount())
                .femaleCount(p.getFemaleCount())
                .paidCount(p.getPaidCount())
                .partialCount(p.getPartialCount())
                .duesCount(p.getDuesCount())
                .build();
    }

    private ActiveStudentDto mapProjectionToDto(ActiveStudentProjection p) {
        String timeSlot = (p.getInTime() != null && p.getOutTime() != null)
                ? p.getInTime().format(TIME_FMT) + " - " + p.getOutTime().format(TIME_FMT) : null;

        return ActiveStudentDto.builder()
                .regNo(p.getRegNo()).name(p.getName())
                .gender(p.getGender()).mobile(p.getMobile())
                .seatNo(p.getSeatNo() != null ? p.getSeatNo() : 0)
                .timeSlot(timeSlot).feeStatus(p.getFeeStatus())
                .dateOfAdmission(p.getDateOfAdmission() != null ? p.getDateOfAdmission().toString() : null)
                .build();
    }
}
