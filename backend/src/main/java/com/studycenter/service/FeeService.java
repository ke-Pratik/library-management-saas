package com.studycenter.service;

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
import com.studycenter.dto.ReversePaymentResponse;
import com.studycenter.dto.StudentFeeStatusResponse;
import com.studycenter.dto.ReceiptResponse;
import com.studycenter.entity.FeeRecord;
import com.studycenter.entity.FeeStructure;
import com.studycenter.entity.Student;
import com.studycenter.entity.StudentFeeConfig;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.exception.StudentNotFoundException;
import com.studycenter.entity.SeatBooking;
import com.studycenter.repository.AllStudentFeeProjection;
import com.studycenter.repository.AllStudentFeeProjection;
import com.studycenter.repository.NoFeeConfigProjection;
import com.studycenter.repository.SeatBookingRepository;
import com.studycenter.repository.FeeRecordRepository;
import com.studycenter.repository.FeeStructureRepository;
import com.studycenter.repository.StudentFeeConfigRepository;
import com.studycenter.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.studycenter.dto.ReviseFeeRequest;
import com.studycenter.dto.ReviseFeeResponse;
import com.studycenter.repository.FeeAdjustmentRepository;
import java.util.Map;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import com.studycenter.dto.SlotChangeRequest;
import com.studycenter.dto.SlotChangeResponse;
import com.studycenter.entity.SeatBooking;
import java.time.YearMonth;
import com.studycenter.dto.AdvancePaymentRequest;
import com.studycenter.dto.AdvancePaymentResponse;
import com.studycenter.entity.PaymentAllocation;
import com.studycenter.repository.PaymentAllocationRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final FeeStructureRepository feeStructureRepository;
    private final FeeRecordRepository feeRecordRepository;
    private final StudentRepository studentRepository;
    private final StudentFeeConfigRepository feeConfigRepository;
    private final SeatBookingRepository seatBookingRepository;
    private final FeeAdjustmentRepository feeAdjustmentRepository;
    private final AdjustmentService       adjustmentService;
    private final WalletService           walletService;
    private final PaymentAllocationRepository paymentAllocationRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final int TOTAL_SEATS = 65;
   

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL: Core fee calculation
    // ═══════════════════════════════════════════════════════════════════
    private FeeCalculateResponse calculateFeeInternal(
            String inTimeStr, String outTimeStr,
            LocalDate joiningDate,
            BigDecimal monthlyDiscount,
            BigDecimal admissionFee) {

        LocalTime inTime  = LocalTime.parse(inTimeStr, TIME_FMT);
        LocalTime outTime = LocalTime.parse(outTimeStr, TIME_FMT);

        if (!inTime.isBefore(outTime))
            throw new InvalidRequestException("inTime must be before outTime");

        if (monthlyDiscount == null) monthlyDiscount = BigDecimal.ZERO;
        if (admissionFee    == null) admissionFee    = BigDecimal.ZERO;

        int feeMonth = joiningDate.getMonthValue();
        int feeYear  = joiningDate.getYear();

        long totalHours = Duration.between(inTime, outTime).toHours();
        BigDecimal monthlyFee;
        String slotName;
        String calcMethod;

        Optional<FeeStructure> mapped = feeStructureRepository
                .findByInTimeAndOutTimeAndIsActiveTrue(inTime, outTime);

        if (mapped.isPresent()) {
            monthlyFee = mapped.get().getFeeAmount();
            slotName   = mapped.get().getSlotName();
            calcMethod = "MAPPED (from fee structure)";
        } else if (totalHours == 4) {
            monthlyFee = new BigDecimal("500.00");
            slotName   = "Custom 4-Hour Slot";
            calcMethod = "DEFAULT_4HR (unmapped 4hr = Rs.500)";
        } else {
            monthlyFee = BigDecimal.valueOf(totalHours * 100);
            slotName   = "Custom " + totalHours + "-Hour Slot";
            calcMethod = "HOURLY (" + totalHours + " hrs x Rs.100)";
        }

        if (monthlyDiscount.compareTo(monthlyFee) > 0)
            throw new InvalidRequestException(
                    "Discount (Rs." + monthlyDiscount + ") cannot exceed monthly fee (Rs." + monthlyFee + ")");

        YearMonth ym        = YearMonth.of(feeYear, feeMonth);
        int totalDays       = ym.lengthOfMonth();
        int dayOfMonth      = joiningDate.getDayOfMonth();
        int applicableDays  = totalDays - dayOfMonth + 1;

        if (applicableDays <= 0 || applicableDays > totalDays)
            throw new InvalidRequestException("Invalid joining date for this month.");

        boolean isMidMonth = (dayOfMonth > 1);

        BigDecimal proratedFee;
        BigDecimal proratedDiscount;
        BigDecimal calcFee;
        String calcFormula;

        if (!isMidMonth) {
            proratedFee      = monthlyFee;
            proratedDiscount = monthlyDiscount;
            calcFee          = monthlyFee.subtract(monthlyDiscount).setScale(2, RoundingMode.HALF_UP);
            calcFormula = "Full month: Rs." + monthlyFee + " - Rs." + monthlyDiscount + " = Rs." + calcFee;
        } else {
            BigDecimal perDayFee      = monthlyFee.divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);
            BigDecimal perDayDiscount = monthlyDiscount.divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);

            proratedFee = perDayFee.multiply(BigDecimal.valueOf(applicableDays)).setScale(2, RoundingMode.HALF_UP);
            proratedDiscount = perDayDiscount.multiply(BigDecimal.valueOf(applicableDays)).setScale(2, RoundingMode.HALF_UP);
            calcFee = proratedFee.subtract(proratedDiscount).setScale(2, RoundingMode.HALF_UP);

            calcFormula = "Pro-rated: (Rs." + monthlyFee + "/" + totalDays + ") x "
                    + applicableDays + " = Rs." + proratedFee
                    + " | Disc: Rs." + proratedDiscount + " | Sub-total: Rs." + calcFee;
        }

        BigDecimal finalFee = calcFee.add(admissionFee).setScale(2, RoundingMode.HALF_UP);
        if (finalFee.compareTo(BigDecimal.ZERO) < 0) finalFee = BigDecimal.ZERO;

        if (admissionFee.compareTo(BigDecimal.ZERO) > 0)
            calcFormula += " | Admission: Rs." + admissionFee + " | Final: Rs." + finalFee;

        YearMonth nextYm      = ym.plusMonths(1);
        String nextMonthLabel = nextYm.getMonth().name() + " " + nextYm.getYear();
        BigDecimal nextMonthFinalFee = monthlyFee.subtract(monthlyDiscount).setScale(2, RoundingMode.HALF_UP);
        if (nextMonthFinalFee.compareTo(BigDecimal.ZERO) < 0) nextMonthFinalFee = BigDecimal.ZERO;

        String nextMonthMessage = isMidMonth
                ? "This month pro-rated (Rs." + finalFee + "). From " + nextMonthLabel
                  + ": Rs." + monthlyFee + " - Rs." + monthlyDiscount + " = Rs." + nextMonthFinalFee + " every month."
                : "Every month: Rs." + monthlyFee + " - Rs." + monthlyDiscount + " = Rs." + nextMonthFinalFee + ".";

        return FeeCalculateResponse.builder()
                .timeSlot(inTimeStr + " - " + outTimeStr)
                .slotName(slotName)
                .feeMonth(feeMonth).feeYear(feeYear)
                .totalDaysInMonth(totalDays).applicableDays(applicableDays)
                .joiningDate(joiningDate.toString())
                .monthlyFee(monthlyFee)
                .proratedFee(proratedFee)
                .admissionFee(admissionFee)
                .monthlyDiscount(monthlyDiscount)
                .proratedDiscount(proratedDiscount)
                .discountAmount(proratedDiscount)
                .finalFee(finalFee)
                .calculationMethod(calcMethod)
                .calculationFormula(calcFormula)
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(finalFee)
                .paymentStatus("PENDING")
                .lockedInDb(false)
                .isMidMonthJoining(isMidMonth)
                .nextMonthLabel(nextMonthLabel)
                .nextMonthFee(monthlyFee)
                .nextMonthDiscount(monthlyDiscount)
                .nextMonthFinalFee(nextMonthFinalFee)
                .nextMonthMessage(nextMonthMessage)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════
    // PREVIEW FEE
    // ═══════════════════════════════════════════════════════════════════
    public FeeCalculateResponse previewFee(FeePreviewRequest request) {
        log.info("Fee preview: time={}-{}, joinDate={}", request.getInTime(), request.getOutTime(), request.getJoiningDate());
        FeeCalculateResponse response = calculateFeeInternal(
                request.getInTime(), request.getOutTime(),
                request.getJoiningDate(), request.getDiscountAmount(), request.getAdmissionFee());
        response.setStudentName("(Preview — No student linked)");
        response.setLockedInDb(false);
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOCK FEE — First time for a student
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public FeeCalculateResponse lockFee(FeeLockRequest request) {
        log.info("Locking fee: regNo={}, time={}-{}, joinDate={}",
                request.getRegNo(), request.getInTime(), request.getOutTime(), request.getJoiningDate());

        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException("Student " + request.getRegNo() + " not found. Register first."));
        if (!student.getIsActive())
            throw new InvalidRequestException("Student " + request.getRegNo() + " is inactive.");

        Optional<StudentFeeConfig> existingConfig = feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(request.getRegNo());
        existingConfig.ifPresent(old -> {
            old.setEffectiveToDate(request.getJoiningDate().minusDays(1));
            feeConfigRepository.save(old);
            log.info("Closed old config id={} for regNo={}", old.getConfigId(), request.getRegNo());
        });

        boolean isFirstEver = existingConfig.isEmpty();
        BigDecimal admissionFee = isFirstEver
                ? (request.getAdmissionFee() != null ? request.getAdmissionFee() : BigDecimal.ZERO)
                : BigDecimal.ZERO;
        BigDecimal discountAmount = request.getDiscountAmount() != null ? request.getDiscountAmount() : BigDecimal.ZERO;

        FeeCalculateResponse calc = calculateFeeInternal(
                request.getInTime(), request.getOutTime(), request.getJoiningDate(), discountAmount, admissionFee);

        LocalTime inTime  = LocalTime.parse(request.getInTime(), TIME_FMT);
        LocalTime outTime = LocalTime.parse(request.getOutTime(), TIME_FMT);

        StudentFeeConfig config = StudentFeeConfig.builder()
                .regNo(request.getRegNo()).inTime(inTime).outTime(outTime)
                .monthlyFee(calc.getMonthlyFee()).discountAmount(discountAmount).admissionFee(admissionFee)
                .effectiveFromDate(request.getJoiningDate()).effectiveToDate(null)
                .createdAt(LocalDateTime.now()).build();

        StudentFeeConfig savedConfig = feeConfigRepository.save(config);
        log.info("Saved fee config id={} for regNo={}", savedConfig.getConfigId(), request.getRegNo());

        int feeMonth = request.getJoiningDate().getMonthValue();
        int feeYear  = request.getJoiningDate().getYear();

        if (feeRecordRepository.existsByRegNoAndFeeMonthAndFeeYear(request.getRegNo(), feeMonth, feeYear))
            throw new InvalidRequestException("Fee already locked for RegNo " + request.getRegNo()
                    + " for " + feeMonth + "/" + feeYear + ". Use payment page to pay.");

        FeeRecord record = FeeRecord.builder()
                .regNo(request.getRegNo()).configId(savedConfig.getConfigId())
                .feeMonth(feeMonth).feeYear(feeYear).inTime(inTime).outTime(outTime)
                .totalDaysInMonth(calc.getTotalDaysInMonth()).applicableDays(calc.getApplicableDays())
                .joiningDateInMonth(request.getJoiningDate())
                .monthlyFee(calc.getMonthlyFee()).proratedFee(calc.getProratedFee())
                .admissionFee(admissionFee).discountAmount(calc.getDiscountAmount())
                .finalFee(calc.getFinalFee()).paidAmount(BigDecimal.ZERO).balanceAmount(calc.getFinalFee())
                .paymentStatus("PENDING").remarks(request.getRemarks()).createdAt(LocalDateTime.now()).build();

        FeeRecord saved = feeRecordRepository.save(record);
        log.info("Fee locked: feeId={}, regNo={}, finalFee={}", saved.getFeeId(), saved.getRegNo(), saved.getFinalFee());

        calc.setFeeId(saved.getFeeId());
        calc.setRegNo(saved.getRegNo());
        calc.setStudentName(student.getName());
        calc.setLockedInDb(true);
        return calc;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTO-GENERATE CURRENT MONTH FEE
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public FeeCalculateResponse autoGenerateCurrentMonthFee(Long regNo) {
        Student student = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found."));
        if (!student.getIsActive())
            throw new InvalidRequestException("Student " + regNo + " is inactive.");

        StudentFeeConfig config = feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(regNo)
                .orElseThrow(() -> new InvalidRequestException(
                        "No fee config found for RegNo " + regNo + ". Please lock fee first on the Fee Calculate page."));

        LocalDate today    = LocalDate.now();
        int currentMonth   = today.getMonthValue();
        int currentYear    = today.getYear();

        if (feeRecordRepository.existsByRegNoAndFeeMonthAndFeeYear(regNo, currentMonth, currentYear)) {
            log.info("Fee record already exists for regNo={} for {}/{}", regNo, currentMonth, currentYear);
            return null;
        }

        LocalDate firstOfMonth = LocalDate.of(currentYear, currentMonth, 1);
        FeeCalculateResponse calc = calculateFeeInternal(
                config.getInTime().format(TIME_FMT), config.getOutTime().format(TIME_FMT),
                firstOfMonth, config.getDiscountAmount(), BigDecimal.ZERO);

        FeeRecord record = FeeRecord.builder()
                .regNo(regNo).configId(config.getConfigId())
                .feeMonth(currentMonth).feeYear(currentYear)
                .inTime(config.getInTime()).outTime(config.getOutTime())
                .totalDaysInMonth(calc.getTotalDaysInMonth()).applicableDays(calc.getApplicableDays())
                .joiningDateInMonth(firstOfMonth)
                .monthlyFee(calc.getMonthlyFee()).proratedFee(calc.getProratedFee())
                .admissionFee(BigDecimal.ZERO).discountAmount(calc.getDiscountAmount())
                .finalFee(calc.getFinalFee()).paidAmount(BigDecimal.ZERO).balanceAmount(calc.getFinalFee())
                .paymentStatus("PENDING").createdAt(LocalDateTime.now()).build();

        FeeRecord saved = feeRecordRepository.save(record);
        log.info("Auto-generated fee: feeId={}, regNo={}, month={}/{}, fee={}",
                saved.getFeeId(), regNo, currentMonth, currentYear, saved.getFinalFee());

        calc.setFeeId(saved.getFeeId());
        calc.setRegNo(regNo);
        calc.setStudentName(student.getName());
        calc.setLockedInDb(true);
        return calc;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RECORD PAYMENT
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public FeePaymentResponse recordPayment(FeePaymentRequest request) {
        log.info("Payment: regNo={}, month={}/{}, amount={}",
                request.getRegNo(), request.getFeeMonth(), request.getFeeYear(), request.getPayAmount());

        String mode = request.getPaymentMode().toUpperCase();
        if (!"CASH".equals(mode) && !"ONLINE".equals(mode))
            throw new InvalidRequestException("paymentMode must be CASH or ONLINE");

        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException("Student " + request.getRegNo() + " not found."));

        FeeRecord record = feeRecordRepository
                .findByRegNoAndFeeMonthAndFeeYear(request.getRegNo(), request.getFeeMonth(), request.getFeeYear())
                .orElseThrow(() -> new InvalidRequestException(
                        "No fee record found for RegNo " + request.getRegNo()
                        + " for " + request.getFeeMonth() + "/" + request.getFeeYear() + ". Please lock fee first."));

        if ("PAID".equals(record.getPaymentStatus()))
            throw new InvalidRequestException("Fee already fully PAID.");

        BigDecimal payAmount = request.getPayAmount();
        if (payAmount.compareTo(BigDecimal.ZERO) <= 0)
            throw new InvalidRequestException("Amount must be > 0");
        if (payAmount.compareTo(record.getBalanceAmount()) > 0)
            throw new InvalidRequestException("Amount Rs." + payAmount + " exceeds balance Rs." + record.getBalanceAmount());

        BigDecimal newPaid    = record.getPaidAmount().add(payAmount);
        BigDecimal newBalance = record.getFinalFee().subtract(newPaid);
        String newStatus      = newBalance.compareTo(BigDecimal.ZERO) <= 0 ? "PAID" : "PARTIAL";
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) newBalance = BigDecimal.ZERO;

        String receipt = generateReceiptNumber(record.getFeeMonth(), record.getFeeYear());
        record.setPaidAmount(newPaid);
        record.setBalanceAmount(newBalance);
        record.setPaymentStatus(newStatus);
        record.setPaymentMode(mode);
        record.setPaymentDate(LocalDate.now());
        record.setReceiptNumber(receipt);
        if (request.getRemarks() != null) record.setRemarks(request.getRemarks());
        feeRecordRepository.save(record);

        return FeePaymentResponse.builder()
                .message("Payment recorded successfully!")
                .feeId(record.getFeeId()).regNo(record.getRegNo()).studentName(student.getName())
                .receiptNumber(receipt).feeMonth(record.getFeeMonth()).feeYear(record.getFeeYear())
                .finalFee(record.getFinalFee()).amountPaidNow(payAmount).totalPaidSoFar(newPaid)
                .balanceRemaining(newBalance).paymentStatus(newStatus).paymentMode(mode)
                .paymentDate(LocalDate.now().toString()).build();
    }

    // ═══════════════════════════════════════════════════════════════════
    // STUDENT FEE STATUS
    // ═══════════════════════════════════════════════════════════════════
    public StudentFeeStatusResponse getStudentFeeStatus(Long regNo) {
        Student student = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found."));

        List<FeeRecord> records = feeRecordRepository.findByRegNoOrderByFeeYearDescFeeMonthDesc(regNo);

        BigDecimal totalFee     = records.stream().map(FeeRecord::getFinalFee).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid    = records.stream().map(FeeRecord::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalBalance = records.stream().map(FeeRecord::getBalanceAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<SeatBooking> bookings = seatBookingRepository.findByRegNoOrderBySeatNoAscStartTimeAsc(regNo);
        Integer seatNo  = bookings.isEmpty() ? null : bookings.get(0).getSeatNo();
        String timeSlot = bookings.isEmpty() ? null :
                bookings.get(0).getStartTime().format(TIME_FMT) + " - " + bookings.get(0).getEndTime().format(TIME_FMT);

        return StudentFeeStatusResponse.builder()
                .regNo(regNo).studentName(student.getName()).gender(student.getGender())
                .mobile(student.getMobile()).isActive(student.getIsActive())
                .seatNo(seatNo).timeSlot(timeSlot).totalMonths(records.size())
                .totalFee(totalFee).totalPaid(totalPaid).totalBalance(totalBalance)
                .overallStatus(totalBalance.compareTo(BigDecimal.ZERO) <= 0 ? "ALL_PAID" : "HAS_PENDING")
                .monthlyRecords(records).build();
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENHANCEMENT #3: ALL STUDENTS FEE STATUS — LEFT JOIN at DB level
    // Single query returns all active students; NULL fee cols → NO_RECORD
    // ═══════════════════════════════════════════════════════════════════
    public AllStudentsFeeStatusResponse getAllStudentsFeeStatus(Integer month, Integer year) {

        // One DB call — LEFT JOIN done by database, not Java
        List<AllStudentFeeProjection> projections = studentRepository.findAllStudentsFeeStatus(month, year);

        long paid = 0, pending = 0, partial = 0, noRecord = 0;
        BigDecimal totalExpected  = BigDecimal.ZERO;
        BigDecimal totalCollected = BigDecimal.ZERO;
        BigDecimal totalBalance   = BigDecimal.ZERO;

        List<AllStudentsFeeStatusResponse.StudentFeeDetail> students = new ArrayList<>();

        for (AllStudentFeeProjection p : projections) {

            String timeSlot = null;
            if (p.getInTime() != null && p.getOutTime() != null) {
                timeSlot = p.getInTime().format(TIME_FMT) + " - " + p.getOutTime().format(TIME_FMT);
            }

            String status = p.getPaymentStatus(); // NULL from DB when LEFT JOIN found no record

            if (status == null) {
                noRecord++;
                status = "NO_RECORD";
            } else {
                if ("PAID".equals(status))         paid++;
                else if ("PARTIAL".equals(status)) partial++;
                else                               pending++;

                if (p.getFinalFee()      != null) totalExpected  = totalExpected.add(p.getFinalFee());
                if (p.getPaidAmount()    != null) totalCollected = totalCollected.add(p.getPaidAmount());
                if (p.getBalanceAmount() != null) totalBalance   = totalBalance.add(p.getBalanceAmount());
            }

            students.add(AllStudentsFeeStatusResponse.StudentFeeDetail.builder()
                    .regNo(p.getRegNo()).studentName(p.getName()).timeSlot(timeSlot)
                    .finalFee(p.getFinalFee()).paidAmount(p.getPaidAmount()).balanceAmount(p.getBalanceAmount())
                    .paymentStatus(status).paymentMode(p.getPaymentMode()).receiptNumber(p.getReceiptNumber())
                    .build());
        }

        return AllStudentsFeeStatusResponse.builder()
                .month(month).year(year).totalStudents(projections.size())
                .paidCount(paid).pendingCount(pending).partialCount(partial).noRecordCount(noRecord)
                .totalFeeExpected(totalExpected).totalCollected(totalCollected).totalBalance(totalBalance)
                .students(students).build();
    }
    // ── END ENHANCEMENT #3 ───────────────────────────────────────────────────

    // ═══════════════════════════════════════════════════════════════════
    // ENHANCEMENT #4: STUDENTS WITH NO FEE CONFIG
    // Single LEFT JOIN query — DB returns only those with no active config
    // ═══════════════════════════════════════════════════════════════════
    public NoConfigStudentsResponse getStudentsWithNoConfig() {
        log.info("Fetching active students with no fee config");

        List<NoFeeConfigProjection> projections = studentRepository.findActiveStudentsWithNoConfig();

        List<NoConfigStudentsResponse.StudentInfo> students = projections.stream()
                .map(p -> NoConfigStudentsResponse.StudentInfo.builder()
                        .regNo(p.getRegNo())
                        .name(p.getName())
                        .mobile(p.getMobile())
                        .timeSlot(p.getInTime() != null && p.getOutTime() != null
                                ? p.getInTime().format(TIME_FMT) + " - " + p.getOutTime().format(TIME_FMT)
                                : null)
                        .dateOfAdmission(p.getDateOfAdmission() != null ? p.getDateOfAdmission().toString() : null)
                        .build())
                .toList();

        String message = students.isEmpty()
                ? "All active students have fee config locked. ✅"
                : students.size() + " active student(s) have no fee config. Lock their fee from the Fee Calculate page.";

        log.info("No-config students: {}", students.size());

        return NoConfigStudentsResponse.builder()
                .count(students.size())
                .message(message)
                .students(students)
                .build();
    }
    // ── END ENHANCEMENT #4 ───────────────────────────────────────────────────

    // ═══════════════════════════════════════════════════════════════════
    // MONTHLY + DATE-RANGE COLLECTION (unchanged)
    // ═══════════════════════════════════════════════════════════════════
    public FeeCollectionResponse getMonthlyCollection(Integer month, Integer year) {
        List<FeeRecord> records = feeRecordRepository.findByFeeMonthAndFeeYear(month, year);
        return FeeCollectionResponse.builder()
                .period(String.format("%02d/%d", month, year))
                .totalStudents(records.size())
                .paidCount((int) records.stream().filter(r -> "PAID".equals(r.getPaymentStatus())).count())
                .pendingCount((int) records.stream().filter(r -> "PENDING".equals(r.getPaymentStatus())).count())
                .partialCount((int) records.stream().filter(r -> "PARTIAL".equals(r.getPaymentStatus())).count())
                .totalFeeExpected(feeRecordRepository.sumFinalFeeByMonth(month, year))
                .totalCollected(feeRecordRepository.sumPaidAmountByMonth(month, year))
                .totalBalance(feeRecordRepository.sumBalanceByMonth(month, year))
                .cashCollected(feeRecordRepository.sumPaidAmountByMonthAndMode(month, year, "CASH"))
                .onlineCollected(feeRecordRepository.sumPaidAmountByMonthAndMode(month, year, "ONLINE"))
                .build();
    }

    public FeeCollectionResponse getCollectionByDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate.isAfter(endDate))
            throw new InvalidRequestException("startDate must be before endDate");
        List<FeeRecord> records = feeRecordRepository.findByPaymentDateBetween(startDate, endDate);
        return FeeCollectionResponse.builder()
                .period(startDate + " to " + endDate)
                .totalStudents(records.size())
                .paidCount((int) records.stream().filter(r -> "PAID".equals(r.getPaymentStatus())).count())
                .pendingCount((int) records.stream().filter(r -> "PENDING".equals(r.getPaymentStatus())).count())
                .partialCount((int) records.stream().filter(r -> "PARTIAL".equals(r.getPaymentStatus())).count())
                .totalFeeExpected(feeRecordRepository.sumFinalFeeByDateRange(startDate, endDate))
                .totalCollected(feeRecordRepository.sumPaidAmountByDateRange(startDate, endDate))
                .totalBalance(feeRecordRepository.sumBalanceByDateRange(startDate, endDate))
                .cashCollected(feeRecordRepository.sumPaidAmountByDateRangeAndMode(startDate, endDate, "CASH"))
                .onlineCollected(feeRecordRepository.sumPaidAmountByDateRangeAndMode(startDate, endDate, "ONLINE"))
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENHANCEMENT #2: GENERATE ALL FEES FOR A MONTH (unchanged)
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public GenerateAllFeesResponse generateAllFeesForMonth(int month, int year) {
        log.info("Generating all fees for {}/{}", month, year);

        List<Student> activeStudents = studentRepository.findByIsActiveTrue();
        int generated = 0, skipped = 0, noConfig = 0;
        List<Long> noConfigRegNos = new ArrayList<>();
        LocalDate firstOfMonth = LocalDate.of(year, month, 1);

        for (Student student : activeStudents) {
            Long regNo = student.getRegNo();
            Optional<StudentFeeConfig> configOpt = feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(regNo);

            if (configOpt.isEmpty()) {
                noConfig++;
                noConfigRegNos.add(regNo);
                log.warn("No fee config for regNo={} — skipping", regNo);
                continue;
            }

            if (feeRecordRepository.existsByRegNoAndFeeMonthAndFeeYear(regNo, month, year)) {
                skipped++;
                continue;
            }

            StudentFeeConfig config = configOpt.get();
            FeeCalculateResponse calc = calculateFeeInternal(
                    config.getInTime().format(TIME_FMT), config.getOutTime().format(TIME_FMT),
                    firstOfMonth, config.getDiscountAmount(), BigDecimal.ZERO);

            FeeRecord record = FeeRecord.builder()
                    .regNo(regNo).configId(config.getConfigId())
                    .feeMonth(month).feeYear(year).inTime(config.getInTime()).outTime(config.getOutTime())
                    .totalDaysInMonth(calc.getTotalDaysInMonth()).applicableDays(calc.getApplicableDays())
                    .joiningDateInMonth(firstOfMonth)
                    .monthlyFee(calc.getMonthlyFee()).proratedFee(calc.getProratedFee())
                    .admissionFee(BigDecimal.ZERO).discountAmount(calc.getDiscountAmount())
                    .finalFee(calc.getFinalFee()).paidAmount(BigDecimal.ZERO).balanceAmount(calc.getFinalFee())
                    .paymentStatus("PENDING").createdAt(LocalDateTime.now()).build();

            feeRecordRepository.save(record);
            generated++;
            log.info("Fee generated: regNo={}, month={}/{}, fee={}", regNo, month, year, calc.getFinalFee());
        }

        String message = String.format(
                "Fee generation complete for %02d/%d — Generated: %d | Skipped: %d | No Config: %d",
                month, year, generated, skipped, noConfig);
        log.info(message);

        return GenerateAllFeesResponse.builder()
                .month(month).year(year).totalActiveStudents(activeStudents.size())
                .generated(generated).skipped(skipped).noConfig(noConfig)
                .noConfigRegNos(noConfigRegNos).message(message).build();
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENHANCEMENT #5: BULK PAYMENT
    // Processes multiple payments in one @Transactional call.
    // If ANY student fails validation, entire batch rolls back.
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public BulkPaymentResponse bulkPayment(BulkPaymentRequest request) {
        log.info("Bulk payment: month={}/{}, mode={}, students={}",
                request.getFeeMonth(), request.getFeeYear(),
                request.getPaymentMode(), request.getPayments().size());

        String mode = request.getPaymentMode().toUpperCase();
        if (!"CASH".equals(mode) && !"ONLINE".equals(mode))
            throw new InvalidRequestException("paymentMode must be CASH or ONLINE");

        if (request.getPayments() == null || request.getPayments().isEmpty())
            throw new InvalidRequestException("Payment list cannot be empty");

        List<BulkPaymentResponse.PaymentResult> results = new ArrayList<>();
        BigDecimal totalCollected = BigDecimal.ZERO;

        for (BulkPaymentRequest.PaymentItem item : request.getPayments()) {

            Student student = studentRepository.findById(item.getRegNo())
                    .orElseThrow(() -> new InvalidRequestException("Student " + item.getRegNo() + " not found"));

            FeeRecord record = feeRecordRepository
                    .findByRegNoAndFeeMonthAndFeeYear(item.getRegNo(), request.getFeeMonth(), request.getFeeYear())
                    .orElseThrow(() -> new InvalidRequestException(
                            "No fee record for Reg#" + item.getRegNo()
                            + " for " + request.getFeeMonth() + "/" + request.getFeeYear()));

            if ("PAID".equals(record.getPaymentStatus()))
                throw new InvalidRequestException("Fee already PAID for Reg#" + item.getRegNo());

            BigDecimal payAmount = item.getAmount();
            if (payAmount == null || payAmount.compareTo(BigDecimal.ZERO) <= 0)
                throw new InvalidRequestException("Amount must be > 0 for Reg#" + item.getRegNo());
            if (payAmount.compareTo(record.getBalanceAmount()) > 0)
                throw new InvalidRequestException(
                        "Amount Rs." + payAmount + " exceeds balance Rs." + record.getBalanceAmount()
                        + " for Reg#" + item.getRegNo());

            BigDecimal newPaid    = record.getPaidAmount().add(payAmount);
            BigDecimal newBalance = record.getFinalFee().subtract(newPaid);
            String newStatus      = newBalance.compareTo(BigDecimal.ZERO) <= 0 ? "PAID" : "PARTIAL";
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) newBalance = BigDecimal.ZERO;

            String receipt = generateReceiptNumber(request.getFeeMonth(), request.getFeeYear());
            record.setPaidAmount(newPaid);
            record.setBalanceAmount(newBalance);
            record.setPaymentStatus(newStatus);
            record.setPaymentMode(mode);
            record.setPaymentDate(LocalDate.now());
            record.setReceiptNumber(receipt);
            feeRecordRepository.save(record);

            totalCollected = totalCollected.add(payAmount);

            results.add(BulkPaymentResponse.PaymentResult.builder()
                    .regNo(item.getRegNo()).studentName(student.getName())
                    .amountPaid(payAmount).balanceRemaining(newBalance)
                    .paymentStatus(newStatus).receiptNumber(receipt).build());

            log.info("Bulk pay: regNo={}, amount={}, status={}", item.getRegNo(), payAmount, newStatus);
        }

        return BulkPaymentResponse.builder()
                .message("Bulk payment processed for " + results.size() + " students!")
                .feeMonth(request.getFeeMonth()).feeYear(request.getFeeYear())
                .paymentMode(mode).totalStudents(results.size())
                .totalAmountCollected(totalCollected)
                .paymentDate(LocalDate.now().toString())
                .results(results).build();
    }
    // ── END ENHANCEMENT #5 ───────────────────────────────────────────────────

    // ═══════════════════════════════════════════════════════════════════
    // ENHANCEMENT #6: REVERSE PAYMENT
    // Resets a PAID or PARTIAL fee record back to PENDING.
    // Use when admin recorded payment against wrong student or wrong amount.
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public ReversePaymentResponse reversePayment(Long feeId, String remarks) {
        log.info("Reversing payment: feeId={}", feeId);

        FeeRecord record = feeRecordRepository.findById(feeId)
                .orElseThrow(() -> new InvalidRequestException("Fee record not found: feeId=" + feeId));

        if ("PENDING".equals(record.getPaymentStatus()))
            throw new InvalidRequestException("Fee record is already PENDING — nothing to reverse.");

        Student student = studentRepository.findById(record.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException("Student " + record.getRegNo() + " not found."));

        BigDecimal reversedAmount = record.getPaidAmount(); // how much is being undone

        // Reset all payment fields — fee record goes back to clean PENDING state
        record.setPaidAmount(BigDecimal.ZERO);
        record.setBalanceAmount(record.getFinalFee());
        record.setPaymentStatus("PENDING");
        record.setPaymentMode(null);
        record.setPaymentDate(null);
        record.setReceiptNumber(null);
        record.setRemarks(remarks != null ? "REVERSED: " + remarks : "REVERSED by admin");
        feeRecordRepository.save(record);

        log.info("Payment reversed: feeId={}, regNo={}, amount={}", feeId, record.getRegNo(), reversedAmount);

        return ReversePaymentResponse.builder()
                .message("Payment of Rs." + reversedAmount + " reversed. Fee status reset to PENDING.")
                .feeId(feeId).regNo(record.getRegNo()).studentName(student.getName())
                .feeMonth(record.getFeeMonth()).feeYear(record.getFeeYear())
                .reversedAmount(reversedAmount).finalFee(record.getFinalFee())
                .newStatus("PENDING").remarks(record.getRemarks()).build();
    }
    // ── END ENHANCEMENT #6 ───────────────────────────────────────────────────

    private String generateReceiptNumber(Integer month, Integer year) {
        long count = feeRecordRepository.countReceiptsByMonthAndYear(month, year);
        return String.format("REC-%d-%02d-%03d", year, month, count + 1);
    }
    
    // ─── E7: Get receipt by receipt number ───────────────────────────────────
public ReceiptResponse getReceipt(String receiptNumber) {
    FeeRecord record = feeRecordRepository.findByReceiptNumber(receiptNumber)
        .orElseThrow(() -> new InvalidRequestException(
            "No receipt found with number: " + receiptNumber));

    Student student = studentRepository.findById(record.getRegNo())
        .orElseThrow(() -> new StudentNotFoundException(
            "Student not found for reg no: " + record.getRegNo()));

    String timeSlot = null;
    if (student.getInTime() != null && student.getOutTime() != null) {
        timeSlot = student.getInTime().format(TIME_FMT)
                 + " - "
                 + student.getOutTime().format(TIME_FMT);
    }

    return ReceiptResponse.builder()
        .receiptNumber(record.getReceiptNumber())
        .regNo(record.getRegNo())
        .studentName(student.getName())
        .feeMonth(record.getFeeMonth())
        .feeYear(record.getFeeYear())
        .finalFee(record.getFinalFee())
        .amountPaid(record.getPaidAmount())
        .balanceAmount(record.getBalanceAmount())
        .paymentStatus(record.getPaymentStatus())
        .paymentMode(record.getPaymentMode())
        .paymentDate(record.getPaymentDate() != null
            ? record.getPaymentDate().toString() : null)
        .timeSlot(timeSlot)
        .build();
}

    // ── Status helper ──────────────────────────────────────────
public static String determineStatus(BigDecimal paid, BigDecimal finalFee) {
    if (paid.signum() == 0)            return "PENDING";
    if (paid.compareTo(finalFee) >= 0) return "PAID";
    return "PARTIAL";
}

// ═══════════════════════════════════════════════════════════════════
// CASE 1 — REVISE FEE (Owner Correction of Discount / Admission)
// ═══════════════════════════════════════════════════════════════════
@Transactional
public ReviseFeeResponse reviseFee(Long feeId, ReviseFeeRequest req) {

    log.info("Revising fee: feeId={}", feeId);

    FeeRecord fr = feeRecordRepository.findById(feeId)
        .orElseThrow(() -> new InvalidRequestException("Fee record " + feeId + " not found"));

    String adminUser = req.getAdminUser() != null ? req.getAdminUser() : "system";
    Map<String,Object> oldVals = adjustmentService.snapshot(fr);

    // Effective values — keep existing if request field is null
    BigDecimal newDiscFullMonth = req.getNewDiscount() != null ? req.getNewDiscount()
        : fr.getDiscountAmount()
              .multiply(BigDecimal.valueOf(fr.getTotalDaysInMonth()))
              .divide(BigDecimal.valueOf(fr.getApplicableDays()), 6, RoundingMode.HALF_UP);

    BigDecimal newAdm = req.getNewAdmissionFee() != null ? req.getNewAdmissionFee()
                                                        : fr.getAdmissionFee();

    if (newDiscFullMonth.compareTo(fr.getMonthlyFee()) > 0)
        throw new InvalidRequestException("Discount cannot exceed monthly fee");

    // Recalculate with original proration
    int totalDays      = fr.getTotalDaysInMonth();
    int applicableDays = fr.getApplicableDays();

    BigDecimal perDayFee  = fr.getMonthlyFee().divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);
    BigDecimal perDayDisc = newDiscFullMonth.divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);

    BigDecimal newProrated     = perDayFee.multiply(BigDecimal.valueOf(applicableDays)).setScale(2, RoundingMode.HALF_UP);
    BigDecimal newProratedDisc = perDayDisc.multiply(BigDecimal.valueOf(applicableDays)).setScale(2, RoundingMode.HALF_UP);
    BigDecimal newFinalFee     = newProrated.subtract(newProratedDisc).add(newAdm).setScale(2, RoundingMode.HALF_UP);
    if (newFinalFee.signum() < 0) newFinalFee = BigDecimal.ZERO;

    BigDecimal oldFinal    = fr.getFinalFee();
    BigDecimal oldBalance  = fr.getBalanceAmount();
    String     oldStatus   = fr.getPaymentStatus();

    BigDecimal newBalance      = newFinalFee.subtract(fr.getPaidAmount()).setScale(2, RoundingMode.HALF_UP);
    BigDecimal walletCredit    = BigDecimal.ZERO;
    String     overpaidNote    = null;

    if (newBalance.signum() < 0) {
        walletCredit = newBalance.abs();
        newBalance   = BigDecimal.ZERO;
        walletService.credit(fr.getRegNo(), walletCredit, WalletService.TxType.CREDIT_FROM_RECALC,
                fr.getFeeId(), "Overpayment after fee revision", adminUser);
        overpaidNote = "Student overpaid Rs." + walletCredit + " — credited to wallet.";
    }

    String newStatus = determineStatus(fr.getPaidAmount(), newFinalFee);

    fr.setDiscountAmount(newProratedDisc);
    fr.setAdmissionFee(newAdm);
    fr.setProratedFee(newProrated);
    fr.setFinalFee(newFinalFee);
    fr.setBalanceAmount(newBalance);
    fr.setPaymentStatus(newStatus);
    feeRecordRepository.save(fr);

    // ── NEW: Sync active FeeConfig so future months + slot change see the new discount ──
    final BigDecimal syncedDiscount = newDiscFullMonth;
    feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(fr.getRegNo())
        .ifPresent(cfg -> {
            cfg.setDiscountAmount(syncedDiscount);
            feeConfigRepository.save(cfg);
            log.info("Synced FeeConfig: regNo={}, newDiscount={}", fr.getRegNo(), syncedDiscount);
        });

    adjustmentService.persist(fr, AdjustmentService.Type.DISCOUNT_REVISED,
            oldVals, adjustmentService.snapshot(fr), req.getReason(), adminUser);

   /* return ReviseFeeResponse.builder()
        .message("Fee revised successfully")
        .feeId(feeId).regNo(fr.getRegNo())
        .oldFinalFee(oldFinal).newFinalFee(newFinalFee)
        .oldBalance(oldBalance).newBalance(newBalance)
        .oldStatus(oldStatus).newStatus(newStatus)
        .walletCreditAdded(walletCredit)
        .overpaidNote(overpaidNote)
        .build();*/
    // ── Next-month bill (monthly fee unchanged, just new discount applied) ──
BigDecimal nextMonthFee = fr.getMonthlyFee().subtract(newDiscFullMonth)
    .setScale(2, RoundingMode.HALF_UP);
if (nextMonthFee.signum() < 0) nextMonthFee = BigDecimal.ZERO;

return ReviseFeeResponse.builder()
    .message("Fee revised successfully")
    .feeId(feeId).regNo(fr.getRegNo())
    .oldFinalFee(oldFinal).newFinalFee(newFinalFee)
    .oldBalance(oldBalance).newBalance(newBalance)
    .oldStatus(oldStatus).newStatus(newStatus)
    .walletCreditAdded(walletCredit)
    .overpaidNote(overpaidNote)
    // ── NEW: next-month preview ──
    .monthlyFee(fr.getMonthlyFee())
    .newMonthlyDiscount(newDiscFullMonth)
    .nextMonthFee(nextMonthFee)
    .build();
}

private BigDecimal resolveMonthlyFee(LocalTime inTime, LocalTime outTime) {
    Optional<FeeStructure> mapped = feeStructureRepository.findByInTimeAndOutTimeAndIsActiveTrue(inTime, outTime);
    if (mapped.isPresent()) return mapped.get().getFeeAmount();
    long hrs = Duration.between(inTime, outTime).toHours();
    if (hrs == 4) return new BigDecimal("500.00");
    return BigDecimal.valueOf(hrs * 100);
}

// ═══════════════════════════════════════════════════════════════════
// CASE 2 + 3 — UNIFIED SLOT CHANGE
// ═══════════════════════════════════════════════════════════════════
@Transactional
public SlotChangeResponse changeSlotForMonth(SlotChangeRequest req) {

    Long regNo = req.getRegNo();
    String adminUser = req.getAdminUser() != null ? req.getAdminUser() : "admin";

    Student student = studentRepository.findById(regNo)
        .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found"));
    if (!student.getIsActive())
        throw new InvalidRequestException("Cannot change slot for inactive student");

    LocalTime newIn  = LocalTime.parse(req.getNewInTime(), TIME_FMT);
    LocalTime newOut = LocalTime.parse(req.getNewOutTime(), TIME_FMT);
    if (!newIn.isBefore(newOut))
        throw new InvalidRequestException("inTime must be before outTime");

    LocalDate today = LocalDate.now();
    int month = today.getMonthValue(), year = today.getYear();
    YearMonth ym = YearMonth.of(year, month);
    int totalDays = ym.lengthOfMonth();
    int changeDay = today.getDayOfMonth();

    // Current month FeeRecord must exist
    FeeRecord fr = feeRecordRepository.findByRegNoAndFeeMonthAndFeeYear(regNo, month, year)
        .orElseThrow(() -> new InvalidRequestException(
            "No fee record for " + month + "/" + year + ". Generate current month fee first."));

    Map<String,Object> oldVals = adjustmentService.snapshot(fr);

    // Gate check
    long booked = seatBookingRepository.countBookedSeatsForSlotExcludingStudent(
            newIn, newOut, regNo, month, year);
    if (booked >= TOTAL_SEATS)
        throw new InvalidRequestException(
            "No seats available in slot " + req.getNewInTime() + "-" + req.getNewOutTime());

    BigDecimal newMonthly  = resolveMonthlyFee(newIn, newOut);
    BigDecimal newDiscount = req.getNewDiscount() != null ? req.getNewDiscount() : BigDecimal.ZERO;
    if (newDiscount.compareTo(newMonthly) > 0)
        throw new InvalidRequestException("Discount cannot exceed monthly fee");

    // ── Split formula (works for changeDay = 1 too) ──
    int dojDay = fr.getJoiningDateInMonth() != null
    ? fr.getJoiningDateInMonth().getDayOfMonth()
    : 1;

    // Student used old slot from DOJ → day before change
    int oldDays = Math.max(0, changeDay - dojDay);
    // Student uses new slot from change day → end of month
    int newDays = totalDays - changeDay + 1;
  
    BigDecimal oldMonthlyFee = fr.getMonthlyFee();
    // Old full-month discount inferred from prorated discount
    BigDecimal oldDiscFull = fr.getApplicableDays() > 0
        ? fr.getDiscountAmount().multiply(BigDecimal.valueOf(totalDays))
              .divide(BigDecimal.valueOf(fr.getApplicableDays()), 6, RoundingMode.HALF_UP)
        : BigDecimal.ZERO;

    BigDecimal perDayOldFee  = oldMonthlyFee.divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);
    BigDecimal perDayOldDisc = oldDiscFull.divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);
    BigDecimal perDayNewFee  = newMonthly.divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);
    BigDecimal perDayNewDisc = newDiscount.divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);

    BigDecimal oldUsedFee     = perDayOldFee.subtract(perDayOldDisc)
                                            .multiply(BigDecimal.valueOf(oldDays))
                                            .setScale(2, RoundingMode.HALF_UP);
    BigDecimal newRemainingFee = perDayNewFee.subtract(perDayNewDisc)
                                             .multiply(BigDecimal.valueOf(newDays))
                                             .setScale(2, RoundingMode.HALF_UP);

    BigDecimal admissionFee = fr.getAdmissionFee();
    BigDecimal revisedFinal = oldUsedFee.add(newRemainingFee).add(admissionFee).setScale(2, RoundingMode.HALF_UP);
    if (revisedFinal.signum() < 0) revisedFinal = BigDecimal.ZERO;

    BigDecimal newBalance = revisedFinal.subtract(fr.getPaidAmount()).setScale(2, RoundingMode.HALF_UP);
    BigDecimal walletCredit = BigDecimal.ZERO;
    String overpaidNote = null;
    if (newBalance.signum() < 0) {
        walletCredit = newBalance.abs();
        newBalance = BigDecimal.ZERO;
        walletService.credit(regNo, walletCredit, WalletService.TxType.CREDIT_FROM_RECALC,
            fr.getFeeId(), "Overpaid after slot change", adminUser);
        overpaidNote = "Student overpaid Rs." + walletCredit + " — credited to wallet.";
    }
    String newStatus = determineStatus(fr.getPaidAmount(), revisedFinal);

    // Update student inTime/outTime
    student.setInTime(newIn);
    student.setOutTime(newOut);
    studentRepository.save(student);

    // Update FeeRecord
    fr.setInTime(newIn);
    fr.setOutTime(newOut);
    fr.setMonthlyFee(newMonthly);
    fr.setDiscountAmount(newDiscount);
    fr.setProratedFee(oldUsedFee.add(newRemainingFee));
    fr.setFinalFee(revisedFinal);
    fr.setBalanceAmount(newBalance);
    fr.setPaymentStatus(newStatus);
    feeRecordRepository.save(fr);

    // Close old FeeConfig + create new
    feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(regNo).ifPresent(cfg -> {
        cfg.setEffectiveToDate(today);
        feeConfigRepository.save(cfg);
    });
    feeConfigRepository.save(StudentFeeConfig.builder()
        .regNo(regNo).inTime(newIn).outTime(newOut)
        .monthlyFee(newMonthly).discountAmount(newDiscount)
        .admissionFee(BigDecimal.ZERO)
        .effectiveFromDate(today).effectiveToDate(null)
        .createdAt(LocalDateTime.now())
        .build());

    // Capture old seat → cancel → try auto-reallot
    Integer oldSeatNo = seatBookingRepository
        .findFirstByRegNoAndBookingMonthAndBookingYear(regNo, month, year)
        .map(SeatBooking::getSeatNo).orElse(null);
    seatBookingRepository.deleteByRegNo(regNo);

    Integer assignedSeatNo = null;
    if (oldSeatNo != null) {
        long conflicts = seatBookingRepository.countConflictsForSeat(
            oldSeatNo, newIn, newOut, regNo, month, year);
        if (conflicts == 0) {
            seatBookingRepository.save(SeatBooking.builder()
                .seatNo(oldSeatNo).regNo(regNo).gender(student.getGender())
                .startTime(newIn).endTime(newOut)
                .bookingMonth(month).bookingYear(year).bookingDate(today)
                .build());
            assignedSeatNo = oldSeatNo;
        }
    }

    // Previous dues warning
    List<FeeRecord> prevUnpaid = feeRecordRepository.findPreviousUnpaidRecords(regNo, month, year);
    List<String> warnings = prevUnpaid.stream()
        .map(f -> String.format("%02d/%d — Rs.%s (%s)",
            f.getFeeMonth(), f.getFeeYear(), f.getBalanceAmount(), f.getPaymentStatus()))
        .toList();

    // Audit
    adjustmentService.persist(fr, AdjustmentService.Type.SLOT_CHANGED,
        oldVals, adjustmentService.snapshot(fr), req.getReason(), adminUser);

    /*return SlotChangeResponse.builder()
        .message(assignedSeatNo != null
            ? "Slot changed. Seat " + assignedSeatNo + " reallotted."
            : "Slot changed. Manual seat re-allotment required.")
        .feeId(fr.getFeeId()).regNo(regNo)
        .changeDay(changeDay).oldDays(oldDays).newDays(newDays)
        .oldUsedFee(oldUsedFee).newRemainingFee(newRemainingFee)
        .admissionFee(admissionFee).revisedFinalFee(revisedFinal)
        .paidAmount(fr.getPaidAmount()).newBalance(newBalance)
        .newStatus(newStatus)
        .walletCreditAdded(walletCredit).overpaidNote(overpaidNote)
        .assignedSeatNo(assignedSeatNo)
        .previousDuesWarning(warnings.isEmpty() ? null : warnings)
        .build();*/
    // ── Next-month bill at new slot rate ──
BigDecimal nextMonthFee = newMonthly.subtract(newDiscount)
    .setScale(2, RoundingMode.HALF_UP);
if (nextMonthFee.signum() < 0) nextMonthFee = BigDecimal.ZERO;

return SlotChangeResponse.builder()
    .message(assignedSeatNo != null
        ? "Slot changed. Seat " + assignedSeatNo + " reallotted."
        : "Slot changed. Manual seat re-allotment required.")
    .feeId(fr.getFeeId()).regNo(regNo)
    .changeDay(changeDay).oldDays(oldDays).newDays(newDays)
    .oldUsedFee(oldUsedFee).newRemainingFee(newRemainingFee)
    .admissionFee(admissionFee).revisedFinalFee(revisedFinal)
    .paidAmount(fr.getPaidAmount()).newBalance(newBalance)
    .newStatus(newStatus)
    .walletCreditAdded(walletCredit).overpaidNote(overpaidNote)
    .assignedSeatNo(assignedSeatNo)
    .previousDuesWarning(warnings.isEmpty() ? null : warnings)
    // ── NEW: next-month preview ──
    .newInTime(req.getNewInTime())
    .newOutTime(req.getNewOutTime())
    .newMonthlyFee(newMonthly)
    .newMonthlyDiscount(newDiscount)
    .nextMonthFee(nextMonthFee)
    .build();
}

    // ═══════════════════════════════════════════════════════════════════
// CASE 4 — ADVANCE PAYMENT (multi-month allocation)
// ═══════════════════════════════════════════════════════════════════
@Transactional
public AdvancePaymentResponse recordAdvancePayment(AdvancePaymentRequest req) {

    log.info("Advance payment: regNo={}, total={}, months={}",
        req.getRegNo(), req.getTotalAmount(), req.getMonths().size());

    String mode = req.getPaymentMode().toUpperCase();
    if (!"CASH".equals(mode) && !"ONLINE".equals(mode))
        throw new InvalidRequestException("paymentMode must be CASH or ONLINE");

    Student student = studentRepository.findById(req.getRegNo())
        .orElseThrow(() -> new StudentNotFoundException("Student " + req.getRegNo() + " not found"));

    String adminUser = req.getAdminUser() != null ? req.getAdminUser() : "admin";
    String paymentId = "PAY-" + System.currentTimeMillis();
    BigDecimal totalAvailable = req.getTotalAmount();
    BigDecimal walletApplied  = BigDecimal.ZERO;

    if (req.isUseWalletBalance()) {
        BigDecimal wb = student.getWalletBalance();
        if (wb.signum() > 0) {
            walletApplied = wb.min(totalAvailable.add(BigDecimal.ZERO));   // safe defensive
            // Actually wallet applies on TOP of cash; recompute below
            walletApplied = wb;        // use full wallet
            walletService.debit(req.getRegNo(), walletApplied,
                WalletService.TxType.DEBIT_APPLIED_TO_FEE, null,
                "Wallet applied to advance payment", adminUser);
            totalAvailable = totalAvailable.add(walletApplied);
        }
    }

    BigDecimal remaining = totalAvailable;
    List<AdvancePaymentResponse.Allocation> results = new ArrayList<>();

    for (AdvancePaymentRequest.MonthSpec ms : req.getMonths()) {
        if (remaining.signum() <= 0) break;

        FeeRecord fr = feeRecordRepository
            .findByRegNoAndFeeMonthAndFeeYear(req.getRegNo(), ms.getMonth(), ms.getYear())
            .orElseGet(() -> autoGenerateFutureMonthRecord(req.getRegNo(), ms.getMonth(), ms.getYear()));

        if ("PAID".equals(fr.getPaymentStatus())) continue;
        if (fr.getBalanceAmount().signum() <= 0) continue;

        BigDecimal toAllocate = remaining.min(fr.getBalanceAmount());
        BigDecimal newPaid    = fr.getPaidAmount().add(toAllocate);
        BigDecimal newBal     = fr.getFinalFee().subtract(newPaid);
        if (newBal.signum() < 0) newBal = BigDecimal.ZERO;
        String     newStatus  = determineStatus(newPaid, fr.getFinalFee());

        String receipt = generateReceiptNumber(fr.getFeeMonth(), fr.getFeeYear());
        fr.setPaidAmount(newPaid);
        fr.setBalanceAmount(newBal);
        fr.setPaymentStatus(newStatus);
        fr.setPaymentMode(mode);
        fr.setPaymentDate(LocalDate.now());
        fr.setReceiptNumber(receipt);
        if (req.getRemarks() != null) fr.setRemarks(req.getRemarks());
        feeRecordRepository.save(fr);

        paymentAllocationRepository.save(PaymentAllocation.builder()
            .paymentId(paymentId).feeId(fr.getFeeId())
            .allocatedAmount(toAllocate).receiptNumber(receipt)
            .build());

        results.add(AdvancePaymentResponse.Allocation.builder()
            .feeId(fr.getFeeId()).month(fr.getFeeMonth()).year(fr.getFeeYear())
            .amountAllocated(toAllocate).newBalance(newBal)
            .newStatus(newStatus).receiptNumber(receipt)
            .build());

        remaining = remaining.subtract(toAllocate);
    }

    BigDecimal walletCreditAdded = BigDecimal.ZERO;
    if (remaining.signum() > 0) {
        walletCreditAdded = remaining;
        walletService.credit(req.getRegNo(), walletCreditAdded,
            WalletService.TxType.CREDIT_ADVANCE_PAYMENT, null,
            "Excess advance payment", adminUser);
    }

    return AdvancePaymentResponse.builder()
        .message("Advance payment processed across " + results.size() + " month(s)")
        .paymentId(paymentId).regNo(req.getRegNo())
        .totalReceived(req.getTotalAmount())
        .walletApplied(walletApplied)
        .walletCreditAdded(walletCreditAdded)
        .allocations(results)
        .build();
}

private FeeRecord autoGenerateFutureMonthRecord(Long regNo, int month, int year) {
    StudentFeeConfig cfg = feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(regNo)
        .orElseThrow(() -> new InvalidRequestException(
            "No active fee config for student " + regNo));

    LocalDate firstOfMonth = LocalDate.of(year, month, 1);
    FeeCalculateResponse calc = calculateFeeInternal(
        cfg.getInTime().format(TIME_FMT), cfg.getOutTime().format(TIME_FMT),
        firstOfMonth, cfg.getDiscountAmount(), BigDecimal.ZERO);

    FeeRecord fr = FeeRecord.builder()
        .regNo(regNo).configId(cfg.getConfigId())
        .feeMonth(month).feeYear(year)
        .inTime(cfg.getInTime()).outTime(cfg.getOutTime())
        .totalDaysInMonth(calc.getTotalDaysInMonth())
        .applicableDays(calc.getApplicableDays())
        .joiningDateInMonth(firstOfMonth)
        .monthlyFee(calc.getMonthlyFee()).proratedFee(calc.getProratedFee())
        .admissionFee(BigDecimal.ZERO)
        .discountAmount(calc.getDiscountAmount())
        .finalFee(calc.getFinalFee())
        .paidAmount(BigDecimal.ZERO)
        .balanceAmount(calc.getFinalFee())
        .paymentStatus("PENDING")
        .createdAt(LocalDateTime.now())
        .build();
    return feeRecordRepository.save(fr);
}
// ── Get current active fee config for a student (used for pre-filling UI) ──
public StudentFeeConfig getActiveConfig(Long regNo) {
    return feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(regNo)
        .orElseThrow(() -> new InvalidRequestException(
            "No active fee config found for student " + regNo));
}

    
}
