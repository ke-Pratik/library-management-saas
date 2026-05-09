package com.studycenter.service;

import com.studycenter.dto.DeactivateReactivateRequest;
import com.studycenter.dto.DeactivateReactivateResponse;
import com.studycenter.dto.StudentDetailResponse;
import com.studycenter.dto.StudentRegisterRequest;
import com.studycenter.dto.StudentRegisterResponse;
import com.studycenter.dto.StudentSummaryResponse;
import com.studycenter.entity.Student;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.exception.StudentNotFoundException;
import com.studycenter.repository.SeatBookingRepository;
import com.studycenter.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentService {

    private final StudentRepository studentRepository;
    private final SeatBookingRepository seatBookingRepository;
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

        return StudentRegisterResponse.builder()
                .message("Student registered successfully!")
                .regNo(request.getRegNo())
                .name(request.getName())
                .gender(request.getGender())
                .dateOfAdmission(request.getDateOfAdmission())
                .inTime(inTime != null ? inTime.format(TIME_FMT) : null)
                .outTime(outTime != null ? outTime.format(TIME_FMT) : null)
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
    // Not getting used eliminate in next deployment , due to new method added in 7 MAY
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
}
