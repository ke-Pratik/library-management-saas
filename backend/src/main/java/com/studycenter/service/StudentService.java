package com.studycenter.service;

import com.studycenter.dto.DeactivateReactivateRequest;
import com.studycenter.dto.DeactivateReactivateResponse;
import com.studycenter.dto.FeeCalculateResponse;    // ← ENHANCEMENT #1: added import
import com.studycenter.dto.FeeLockRequest;           // ← ENHANCEMENT #1: added import
import com.studycenter.dto.StudentDetailResponse;
import com.studycenter.dto.StudentRegisterRequest;
import com.studycenter.dto.StudentRegisterResponse;
import com.studycenter.dto.StudentSummaryResponse;
import com.studycenter.dto.ActiveStudentDto;
import com.studycenter.dto.ActiveStudentsPageResponse;
import com.studycenter.repository.ActiveStudentProjection;
import com.studycenter.repository.SeatBookingRepository;
import com.studycenter.repository.StudentRepository;
import com.studycenter.entity.Student;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.exception.StudentNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal; // ← ENHANCEMENT #1: added import
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final SeatBookingRepository seatBookingRepository;
    private final FeeService feeService; // ← ENHANCEMENT #1: inject FeeService
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    @Transactional
    public StudentRegisterResponse registerStudent(StudentRegisterRequest request) {

        log.info("Registering: regNo={}, name={}", request.getRegNo(), request.getName());

        if (studentRepository.existsById(request.getRegNo()))
            throw new InvalidRequestException("Student with regNo " + request.getRegNo() + " already exists.");
        if (studentRepository.existsByAadhaarNo(request.getAadhaarNo()))
            throw new InvalidRequestException("Aadhaar " + request.getAadhaarNo() + " is already registered.");

        LocalDate admissionDate = LocalDate.parse(request.getDateOfAdmission());
        if (request.getInTime() == null || request.getInTime().isEmpty())
            throw new InvalidRequestException("inTime is required");
        if (request.getOutTime() == null || request.getOutTime().isEmpty())
            throw new InvalidRequestException("outTime is required");

        LocalTime inTime = LocalTime.parse(request.getInTime());
        LocalTime outTime = LocalTime.parse(request.getOutTime());

        if (inTime != null && outTime != null && !inTime.isBefore(outTime))
            throw new InvalidRequestException("inTime must be before outTime");

        Student student = Student.builder()
                .regNo(request.getRegNo())
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
        log.info("Student registered: regNo={}", request.getRegNo());

        // ── ENHANCEMENT #1: Auto-lock fee immediately after student is saved ──
        // Both student save and fee lock are inside the same @Transactional method.
        // Spring propagation=REQUIRED means feeService.lockFee() joins this transaction.
        // If fee locking fails for any reason, student save also rolls back atomically.
        FeeLockRequest feeLockRequest = FeeLockRequest.builder()
                .regNo(request.getRegNo())
                .inTime(request.getInTime())
                .outTime(request.getOutTime())
                .joiningDate(admissionDate)
                .admissionFee(request.getAdmissionFee() != null ? request.getAdmissionFee() : BigDecimal.ZERO)
                .discountAmount(request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO)
                .remarks(request.getRemarks())
                .build();

        FeeCalculateResponse feeResult = feeService.lockFee(feeLockRequest);
        log.info("Fee auto-locked: feeId={}, finalFee={}", feeResult.getFeeId(), feeResult.getFinalFee());
        // ── END ENHANCEMENT #1 ───────────────────────────────────────────────

        return StudentRegisterResponse.builder()
                .message("Student registered and fee locked successfully!")
                .regNo(request.getRegNo())
                .name(request.getName())
                .gender(request.getGender())
                .dateOfAdmission(request.getDateOfAdmission())
                .inTime(inTime != null ? inTime.format(TIME_FMT) : null)
                .outTime(outTime != null ? outTime.format(TIME_FMT) : null)
                // ── ENHANCEMENT #1: include fee summary in response ──────────
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
                // ── END ENHANCEMENT #1 ──────────────────────────────────────
                .build();
    }

    @Transactional
    public DeactivateReactivateResponse deactivateStudent(DeactivateReactivateRequest request) {

        log.info("Deactivating: regNo={}", request.getRegNo());

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

        log.info("Deactivated: regNo={}, bookingsCancelled={}", request.getRegNo(), cancelled);

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

        log.info("Reactivating: regNo={}", request.getRegNo());

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

    public List<StudentDetailResponse> getActiveStudents() {
        return studentRepository.findByIsActiveTrue().stream()
                .map(this::toDetailResponse).toList();
    }

    public List<StudentDetailResponse> getInactiveStudents() {
        return studentRepository.findByIsActiveFalse().stream()
                .map(this::toDetailResponse).toList();
    }

    public StudentSummaryResponse getStudentSummary() {
        long active = studentRepository.countByIsActiveTrue();
        long inactive = studentRepository.countByIsActiveFalse();
        return StudentSummaryResponse.builder()
                .totalStudents(active + inactive)
                .activeStudents(active)
                .inactiveStudents(inactive)
                .build();
    }

    // New Method Start 7 MAY
    public List<StudentDetailResponse> searchStudents(String type, String value) {

        log.info("Searching students: type={}, value={}", type, value);

        if (type == null || type.trim().isEmpty()) {
            throw new InvalidRequestException("Search type cannot be empty.");
        }

        if (value == null || value.trim().isEmpty()) {
            throw new InvalidRequestException("Search value cannot be empty.");
        }

        String searchType = type.trim().toLowerCase();
        String searchValue = value.trim();

        List<Student> students;

        switch (searchType) {
            case "regno" -> {
                try {
                    Long regNo = Long.parseLong(searchValue);
                    students = studentRepository.searchActiveByRegNo(regNo);
                } catch (NumberFormatException ex) {
                    throw new InvalidRequestException("Reg No must be a valid number.");
                }
            }
            case "mobile" -> students = studentRepository.searchActiveByMobile(searchValue);
            case "name" -> students = studentRepository.searchActiveByName(searchValue);
            default -> throw new InvalidRequestException("Invalid search type. Use regNo, mobile, or name.");
        }

        return students.stream()
                .map(this::toDetailResponse)
                .toList();
    }
    // New Method End 7 MAY

    // Not getting used — eliminate in next deployment, due to new method added in 7 MAY
    public List<StudentDetailResponse> searchByName(String name) {

        log.info("Searching: name={}", name);

        if (name == null || name.trim().isEmpty())
            throw new InvalidRequestException("Search name cannot be empty.");

        return studentRepository.searchByName(name.trim()).stream()
                .map(this::toDetailResponse).toList();
    }

    private StudentDetailResponse toDetailResponse(Student s) {
        return StudentDetailResponse.builder()
                .regNo(s.getRegNo())
                .name(s.getName())
                .fatherName(s.getFatherName())
                .gender(s.getGender())
                .mobile(s.getMobile())
                .address(s.getAddress())
                .aadhaarNo(s.getAadhaarNo())
                .dateOfAdmission(s.getDateOfAdmission() != null ? s.getDateOfAdmission().toString() : null)
                .inTime(s.getInTime() != null ? s.getInTime().format(TIME_FMT) : null)
                .outTime(s.getOutTime() != null ? s.getOutTime().format(TIME_FMT) : null)
                .isActive(s.getIsActive())
                .deactivationDate(s.getDeactivationDate() != null ? s.getDeactivationDate().toString() : null)
                .remarks(s.getRemarks())
                .build();
    }

    public ActiveStudentsPageResponse getActiveStudentsPaged(int page, int size) {
        LocalDate today = LocalDate.now();
        Pageable pageable = PageRequest.of(page, size);
        Page<ActiveStudentProjection> result = studentRepository.findActiveStudentsWithDetails(
                today.getMonthValue(), today.getYear(), pageable);

        List<ActiveStudentDto> students = result.getContent().stream()
                .map(this::mapProjectionToDto)
                .toList();

        return ActiveStudentsPageResponse.builder()
                .students(students)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private ActiveStudentDto mapProjectionToDto(ActiveStudentProjection p) {
        String timeSlot = null;
        if (p.getInTime() != null && p.getOutTime() != null) {
            timeSlot = p.getInTime().format(TIME_FMT) + " - " + p.getOutTime().format(TIME_FMT);
        }
        return ActiveStudentDto.builder()
                .regNo(p.getRegNo())
                .name(p.getName())
                .gender(p.getGender())
                .mobile(p.getMobile())
                .seatNo(p.getSeatNo() != null ? p.getSeatNo() : 0)
                .timeSlot(timeSlot)
                .feeStatus(p.getFeeStatus())
                .dateOfAdmission(p.getDateOfAdmission() != null ? p.getDateOfAdmission().toString() : null)
                .build();
    }
}
