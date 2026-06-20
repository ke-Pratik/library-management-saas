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
import com.studycenter.dto.DeactivatePreviewResponse;
import com.studycenter.entity.FeeRecord;
import com.studycenter.repository.FeeRecordRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.Optional;
import com.studycenter.entity.SeatBooking;
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
    private final FeeRecordRepository feeRecordRepository;
    private final WalletService walletService;

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

    // ═══════════════════════════════════════════════════════════════════
// DEACTIVATE — PREVIEW (no DB writes)
// ═══════════════════════════════════════════════════════════════════
public DeactivatePreviewResponse previewDeactivate(DeactivateReactivateRequest req) {

    Student student = studentRepository.findById(req.getRegNo())
            .orElseThrow(() -> new StudentNotFoundException("Student " + req.getRegNo() + " not found."));
    if (!student.getIsActive())
        throw new InvalidRequestException("Student " + req.getRegNo() + " is already inactive.");

    LocalDate today = LocalDate.now();
    LocalDate lastActive = req.getLastActiveDate() != null ? req.getLastActiveDate() : today;
    boolean neverUsed = Boolean.TRUE.equals(req.getNeverUsed());

    int month = today.getMonthValue();
    int year  = today.getYear();
    int totalDaysInMonth = YearMonth.of(year, month).lengthOfMonth();

    Optional<FeeRecord> optRecord = feeRecordRepository
            .findByRegNoAndFeeMonthAndFeeYear(req.getRegNo(), month, year);

    DeactivatePreviewResponse.DeactivatePreviewResponseBuilder b = DeactivatePreviewResponse.builder()
            .regNo(student.getRegNo())
            .studentName(student.getName())
            .joiningDate(student.getDateOfAdmission())
            .lastActiveDate(lastActive)
            .totalDaysInMonth(totalDaysInMonth);

    // Count future records
    java.util.List<FeeRecord> all = feeRecordRepository.findByRegNoOrderByFeeYearDescFeeMonthDesc(req.getRegNo());
    int futureCount = (int) all.stream()
            .filter(r -> r.getFeeYear() > year || (r.getFeeYear() == year && r.getFeeMonth() > month))
            .count();
    b.futureRecordsCount(futureCount);

    // Seat info
    Integer seatNo = seatBookingRepository
            .findFirstByRegNoAndBookingMonthAndBookingYear(req.getRegNo(), month, year)
            .map(SeatBooking::getSeatNo).orElse(null);
    b.seatToCancel(seatNo);

    if (!optRecord.isPresent()) {
        return b.hasCurrentMonthRecord(false)
                .daysUsed(0)
                .willDeleteRecord(false)
                .needsBalanceDecision(false)
                .build();
    }

    FeeRecord fr = optRecord.get();
    b.hasCurrentMonthRecord(true)
     .oldFinalFee(fr.getFinalFee())
     .oldPaid(fr.getPaidAmount())
     .oldBalance(fr.getBalanceAmount())
     .oldStatus(fr.getPaymentStatus())
     .isMidMonthRecord(fr.getApplicableDays() != null
             && fr.getTotalDaysInMonth() != null
             && !fr.getApplicableDays().equals(fr.getTotalDaysInMonth()));

    if (neverUsed) {
        return b.daysUsed(0)
                .willDeleteRecord(true)
                .newFinalFee(BigDecimal.ZERO)
                .newBalance(BigDecimal.ZERO)
                .newStatus("DELETED")
                .needsBalanceDecision(false)
                .build();
    }

    // Calculate days used (DOJ → lastActive, clamped to current month)
    LocalDate doj = fr.getJoiningDateInMonth() != null ? fr.getJoiningDateInMonth() : student.getDateOfAdmission();
    long daysUsed = lastActive.toEpochDay() - doj.toEpochDay() + 1;
    if (daysUsed < 0) daysUsed = 0;
    if (daysUsed > totalDaysInMonth) daysUsed = totalDaysInMonth;
    b.daysUsed((int) daysUsed);

    String feeHandling = req.getFeeHandling() != null ? req.getFeeHandling() : "PRORATE";

    if ("WAIVE".equalsIgnoreCase(feeHandling)) {
        // Waive: keep finalFee, set balance to 0
        b.newFinalFee(fr.getFinalFee())
         .newBalance(BigDecimal.ZERO)
         .newStatus("PAID")
         .walletCreditWillAdd(BigDecimal.ZERO)
         .balanceAfterProRate(BigDecimal.ZERO)
         .needsBalanceDecision(false)
         .willDeleteRecord(false);
        return b.build();
    }

    // PRORATE path
    BigDecimal monthlyFee = fr.getMonthlyFee();
    BigDecimal discount   = fr.getDiscountAmount() != null ? fr.getDiscountAmount() : BigDecimal.ZERO;
    BigDecimal admission  = fr.getAdmissionFee() != null ? fr.getAdmissionFee() : BigDecimal.ZERO;

    // Pro-rate fee and discount based on daysUsed (relative to applicableDays of original record)
    int origApplicable = fr.getApplicableDays() != null ? fr.getApplicableDays() : totalDaysInMonth;
    BigDecimal perDayFee = monthlyFee.divide(BigDecimal.valueOf(totalDaysInMonth), 6, RoundingMode.HALF_UP);
    // Discount was already pro-rated to applicableDays; convert back to per-day
    BigDecimal perDayDisc = origApplicable > 0
            ? discount.divide(BigDecimal.valueOf(origApplicable), 6, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

    BigDecimal proratedFee  = perDayFee.multiply(BigDecimal.valueOf(daysUsed)).setScale(2, RoundingMode.HALF_UP);
    BigDecimal proratedDisc = perDayDisc.multiply(BigDecimal.valueOf(daysUsed)).setScale(2, RoundingMode.HALF_UP);
    BigDecimal newFinalFee  = proratedFee.subtract(proratedDisc).add(admission).setScale(2, RoundingMode.HALF_UP);
    if (newFinalFee.signum() < 0) newFinalFee = BigDecimal.ZERO;

    BigDecimal paid = fr.getPaidAmount();
    BigDecimal newBalance = newFinalFee.subtract(paid).setScale(2, RoundingMode.HALF_UP);
    BigDecimal walletCredit = BigDecimal.ZERO;
    boolean needsBalanceDecision = false;

    if (newBalance.signum() < 0) {
        walletCredit = newBalance.abs();
        newBalance = BigDecimal.ZERO;
    } else if (newBalance.signum() > 0) {
        needsBalanceDecision = true;
    }

    String newStatus = newBalance.signum() <= 0 ? "PAID" : "PARTIAL";

    return b.newFinalFee(newFinalFee)
            .newBalance(newBalance)
            .newStatus(newStatus)
            .walletCreditWillAdd(walletCredit)
            .balanceAfterProRate(newBalance)
            .needsBalanceDecision(needsBalanceDecision)
            .willDeleteRecord(false)
            .build();
}

// ═══════════════════════════════════════════════════════════════════
// DEACTIVATE — EXECUTE
// ═══════════════════════════════════════════════════════════════════
@Transactional
public DeactivateReactivateResponse deactivateStudent(DeactivateReactivateRequest request) {

    Student student = studentRepository.findById(request.getRegNo())
            .orElseThrow(() -> new StudentNotFoundException("Student " + request.getRegNo() + " not found."));
    if (!student.getIsActive())
        throw new InvalidRequestException("Student " + request.getRegNo() + " is already inactive.");

    LocalDate today = LocalDate.now();
    LocalDate lastActive = request.getLastActiveDate() != null ? request.getLastActiveDate() : today;
    boolean neverUsed = Boolean.TRUE.equals(request.getNeverUsed());

    int month = today.getMonthValue();
    int year  = today.getYear();
    int totalDaysInMonth = YearMonth.of(year, month).lengthOfMonth();

    Optional<FeeRecord> optRecord = feeRecordRepository
            .findByRegNoAndFeeMonthAndFeeYear(request.getRegNo(), month, year);

    boolean currentMonthDeleted = false;
    BigDecimal oldFinalFee  = BigDecimal.ZERO;
    BigDecimal newFinalFee  = BigDecimal.ZERO;
    BigDecimal amountCollected = BigDecimal.ZERO;
    BigDecimal amountWaived  = BigDecimal.ZERO;
    BigDecimal walletCredit  = BigDecimal.ZERO;
    String receiptNumber = null;

    // ── Handle current month fee record ──
    if (optRecord.isPresent()) {
        FeeRecord fr = optRecord.get();
        oldFinalFee = fr.getFinalFee();

        if (neverUsed) {
            // Case 1: Never used → DELETE the record
            feeRecordRepository.delete(fr);
            currentMonthDeleted = true;
        } else {
            String feeHandling = request.getFeeHandling() != null ? request.getFeeHandling() : "PRORATE";

            if ("WAIVE".equalsIgnoreCase(feeHandling)) {
                // Waive: keep finalFee, set balance to 0
                amountWaived = fr.getBalanceAmount() != null ? fr.getBalanceAmount() : BigDecimal.ZERO;
                fr.setBalanceAmount(BigDecimal.ZERO);
                fr.setPaymentStatus("PAID");
                fr.setRemarks((fr.getRemarks() != null ? fr.getRemarks() + " | " : "")
                        + "WAIVED on deactivation: Rs." + amountWaived);
                feeRecordRepository.save(fr);
                newFinalFee = fr.getFinalFee();
            } else {
                // PRORATE
                LocalDate doj = fr.getJoiningDateInMonth() != null ? fr.getJoiningDateInMonth() : student.getDateOfAdmission();
                long daysUsed = lastActive.toEpochDay() - doj.toEpochDay() + 1;
                if (daysUsed < 0) daysUsed = 0;
                if (daysUsed > totalDaysInMonth) daysUsed = totalDaysInMonth;

                BigDecimal monthlyFee = fr.getMonthlyFee();
                BigDecimal discount   = fr.getDiscountAmount() != null ? fr.getDiscountAmount() : BigDecimal.ZERO;
                BigDecimal admission  = fr.getAdmissionFee() != null ? fr.getAdmissionFee() : BigDecimal.ZERO;
                int origApplicable = fr.getApplicableDays() != null ? fr.getApplicableDays() : totalDaysInMonth;

                BigDecimal perDayFee  = monthlyFee.divide(BigDecimal.valueOf(totalDaysInMonth), 6, RoundingMode.HALF_UP);
                BigDecimal perDayDisc = origApplicable > 0
                        ? discount.divide(BigDecimal.valueOf(origApplicable), 6, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
                BigDecimal proratedFee  = perDayFee.multiply(BigDecimal.valueOf(daysUsed)).setScale(2, RoundingMode.HALF_UP);
                BigDecimal proratedDisc = perDayDisc.multiply(BigDecimal.valueOf(daysUsed)).setScale(2, RoundingMode.HALF_UP);
                BigDecimal computedFinalFee = proratedFee.subtract(proratedDisc).add(admission).setScale(2, RoundingMode.HALF_UP);
                if (computedFinalFee.signum() < 0) computedFinalFee = BigDecimal.ZERO;

                BigDecimal paid = fr.getPaidAmount();
                BigDecimal newBalance = computedFinalFee.subtract(paid).setScale(2, RoundingMode.HALF_UP);

                if (newBalance.signum() < 0) {
                    // Overpaid → wallet credit
                    walletCredit = newBalance.abs();
                    newBalance = BigDecimal.ZERO;
                    walletService.credit(request.getRegNo(), walletCredit,
                            WalletService.TxType.CREDIT_FROM_RECALC,
                            fr.getFeeId(), "Overpaid after deactivation pro-rate", "admin");
                } else if (newBalance.signum() > 0) {
                    // Still owes → handle based on balanceAction
                    String balanceAction = request.getBalanceAction() != null ? request.getBalanceAction() : "WAIVE";

                    if ("COLLECT".equalsIgnoreCase(balanceAction)) {
                        // Record payment
                        String mode = request.getCollectMode() != null ? request.getCollectMode().toUpperCase() : "CASH";
                        if (!"CASH".equals(mode) && !"ONLINE".equals(mode)) mode = "CASH";

                        BigDecimal newPaid = paid.add(newBalance);
                        receiptNumber = generateDeactivationReceipt(month, year);
                        fr.setPaidAmount(newPaid);
                        amountCollected = newBalance;
                        newBalance = BigDecimal.ZERO;
                        fr.setPaymentMode(mode);
                        fr.setPaymentDate(today);
                        fr.setReceiptNumber(receiptNumber);
                    } else {
                        // WAIVE the remaining balance
                        amountWaived = newBalance;
                        newBalance = BigDecimal.ZERO;
                        fr.setRemarks((fr.getRemarks() != null ? fr.getRemarks() + " | " : "")
                                + "Pro-rate + waived Rs." + amountWaived + " on deactivation");
                    }
                }

                // Save the recalculated record
                fr.setFinalFee(computedFinalFee);
                fr.setProratedFee(proratedFee);
                fr.setDiscountAmount(proratedDisc);
                fr.setApplicableDays((int) daysUsed);
                fr.setBalanceAmount(newBalance);
                fr.setPaymentStatus(newBalance.signum() <= 0 ? "PAID" : "PARTIAL");
                feeRecordRepository.save(fr);
                newFinalFee = computedFinalFee;
            }
        }
    }

    // ── Delete future-month fee records ──
    int futureDeleted = feeRecordRepository.deleteFutureRecordsByRegNo(request.getRegNo(), month, year);

    // ── Cancel seat bookings (existing logic) ──
    long cancelled = seatBookingRepository.countByRegNo(request.getRegNo());
    seatBookingRepository.deleteByRegNo(request.getRegNo());

    // ── Update student ──
    student.setIsActive(false);
    student.setDeactivationDate(today);
    student.setLastActiveDate(lastActive);
    student.setRemarks(request.getRemarks());
    studentRepository.save(student);

    return DeactivateReactivateResponse.builder()
            .message("Student deactivated successfully!")
            .regNo(request.getRegNo())
            .name(student.getName())
            .isActive(false)
            .deactivationDate(today.toString())
            .lastActiveDate(lastActive.toString())
            .remarks(request.getRemarks())
            .bookingsCancelled((int) cancelled)
            .currentMonthDeleted(currentMonthDeleted)
            .oldFinalFee(oldFinalFee)
            .newFinalFee(newFinalFee)
            .amountCollected(amountCollected)
            .amountWaived(amountWaived)
            .walletCreditAdded(walletCredit)
            .receiptNumber(receiptNumber)
            .futureRecordsDeleted(futureDeleted)
            .build();
}

private String generateDeactivationReceipt(Integer month, Integer year) {
    long count = feeRecordRepository.countReceiptsByMonthAndYear(month, year);
    return String.format("REC-%d-%02d-%03d", year, month, count + 1);
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
