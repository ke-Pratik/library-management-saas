package com.studycenter.service;

import com.studycenter.dto.AllStudentsFeeStatusResponse;
import com.studycenter.dto.FeeCalculateResponse;
import com.studycenter.dto.FeeCollectionResponse;
import com.studycenter.dto.FeeLockRequest;
import com.studycenter.dto.FeePaymentRequest;
import com.studycenter.dto.FeePaymentResponse;
import com.studycenter.dto.FeePreviewRequest;
import com.studycenter.dto.StudentFeeStatusResponse;
import com.studycenter.entity.FeeRecord;
import com.studycenter.entity.FeeStructure;
import com.studycenter.entity.Student;
import com.studycenter.entity.StudentFeeConfig;
import com.studycenter.exception.InvalidRequestException;
import com.studycenter.exception.StudentNotFoundException;
import com.studycenter.repository.FeeRecordRepository;
import com.studycenter.repository.FeeStructureRepository;
import com.studycenter.repository.StudentFeeConfigRepository;
import com.studycenter.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeeService {

    private final FeeStructureRepository feeStructureRepository;
    private final FeeRecordRepository feeRecordRepository;
    private final StudentRepository studentRepository;
    private final StudentFeeConfigRepository feeConfigRepository;
    private final SeatBookingRepository seatBookingRepository;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    // ═══════════════════════════════════════════════════════════════════
    // INTERNAL: Core fee calculation
    // admissionFee is only passed for first month; BigDecimal.ZERO otherwise
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

        // ── Slot / fee lookup ─────────────────────────────────────────
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

        // ── Pro-ration ────────────────────────────────────────────────
        YearMonth ym        = YearMonth.of(feeYear, feeMonth);
        int totalDays       = ym.lengthOfMonth();
        int dayOfMonth      = joiningDate.getDayOfMonth();
        int applicableDays  = totalDays - dayOfMonth + 1;

        if (applicableDays <= 0 || applicableDays > totalDays)
            throw new InvalidRequestException("Invalid joining date for this month.");

        boolean isMidMonth = (dayOfMonth > 1);

        BigDecimal proratedFee;
        BigDecimal proratedDiscount;
        BigDecimal calcFee; // fee before admission fee
        String calcFormula;

        if (!isMidMonth) {
            // Full month
            proratedFee      = monthlyFee;
            proratedDiscount = monthlyDiscount;
            calcFee          = monthlyFee.subtract(monthlyDiscount)
                                         .setScale(2, RoundingMode.HALF_UP);
            calcFormula = "Full month: Rs." + monthlyFee
                    + " - Rs." + monthlyDiscount + " (discount) = Rs." + calcFee;
        } else {
            // Mid-month pro-ration
            BigDecimal perDayFee = monthlyFee
                    .divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);
            BigDecimal perDayDiscount = monthlyDiscount
                    .divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);

            proratedFee = perDayFee
                    .multiply(BigDecimal.valueOf(applicableDays))
                    .setScale(2, RoundingMode.HALF_UP);
            proratedDiscount = perDayDiscount
                    .multiply(BigDecimal.valueOf(applicableDays))
                    .setScale(2, RoundingMode.HALF_UP);

            calcFee = proratedFee.subtract(proratedDiscount)
                                  .setScale(2, RoundingMode.HALF_UP);

            calcFormula = "Pro-rated: (Rs." + monthlyFee + " / " + totalDays + ") x "
                    + applicableDays + " = Rs." + proratedFee
                    + " | Disc: Rs." + proratedDiscount
                    + " | Sub-total: Rs." + calcFee;
        }

        // ── Add admission fee ─────────────────────────────────────────
        BigDecimal finalFee = calcFee.add(admissionFee).setScale(2, RoundingMode.HALF_UP);
        if (finalFee.compareTo(BigDecimal.ZERO) < 0) finalFee = BigDecimal.ZERO;

        if (admissionFee.compareTo(BigDecimal.ZERO) > 0)
            calcFormula += " | Admission: Rs." + admissionFee + " | Final: Rs." + finalFee;

        // ── Next month info ───────────────────────────────────────────
        YearMonth nextYm      = ym.plusMonths(1);
        String nextMonthLabel = nextYm.getMonth().name() + " " + nextYm.getYear();
        BigDecimal nextMonthFinalFee = monthlyFee.subtract(monthlyDiscount)
                                                  .setScale(2, RoundingMode.HALF_UP);
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
    // PREVIEW FEE — No DB save, no RegNo needed
    // ═══════════════════════════════════════════════════════════════════
    public FeeCalculateResponse previewFee(FeePreviewRequest request) {
        log.info("Fee preview: time={}-{}, joinDate={}",
                request.getInTime(), request.getOutTime(), request.getJoiningDate());

        FeeCalculateResponse response = calculateFeeInternal(
                request.getInTime(), request.getOutTime(),
                request.getJoiningDate(),
                request.getDiscountAmount(),
                request.getAdmissionFee());

        response.setStudentName("(Preview — No student linked)");
        response.setLockedInDb(false);
        return response;
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOCK FEE — First time for a student
    // Saves StudentFeeConfig + creates first FeeRecord
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public FeeCalculateResponse lockFee(FeeLockRequest request) {
        log.info("Locking fee: regNo={}, time={}-{}, joinDate={}",
                request.getRegNo(), request.getInTime(), request.getOutTime(), request.getJoiningDate());

        // ── Validate student ──────────────────────────────────────────
        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException(
                        "Student " + request.getRegNo() + " not found. Register first."));
        if (!student.getIsActive())
            throw new InvalidRequestException("Student " + request.getRegNo() + " is inactive.");

        // ── Check for existing config ─────────────────────────────────
        // If config exists this is a config-change scenario (slot change)
        // Close the old config, create new one
        Optional<StudentFeeConfig> existingConfig =
                feeConfigRepository.findByRegNoAndEffectiveToDateIsNull(request.getRegNo());

        existingConfig.ifPresent(old -> {
            old.setEffectiveToDate(request.getJoiningDate().minusDays(1));
            feeConfigRepository.save(old);
            log.info("Closed old config id={} for regNo={}", old.getConfigId(), request.getRegNo());
        });

        // ── Calculate fee ─────────────────────────────────────────────
        boolean isFirstEver = existingConfig.isEmpty();
        BigDecimal admissionFee = isFirstEver
                ? (request.getAdmissionFee() != null ? request.getAdmissionFee() : BigDecimal.ZERO)
                : BigDecimal.ZERO; // no admission fee on config change

        BigDecimal discountAmount = request.getDiscountAmount() != null
                ? request.getDiscountAmount() : BigDecimal.ZERO;

        FeeCalculateResponse calc = calculateFeeInternal(
                request.getInTime(), request.getOutTime(),
                request.getJoiningDate(),
                discountAmount,
                admissionFee);

        // ── Lookup monthly fee from calculation result ─────────────────
        LocalTime inTime  = LocalTime.parse(request.getInTime(), TIME_FMT);
        LocalTime outTime = LocalTime.parse(request.getOutTime(), TIME_FMT);

        // ── Save StudentFeeConfig ─────────────────────────────────────
        StudentFeeConfig config = StudentFeeConfig.builder()
                .regNo(request.getRegNo())
                .inTime(inTime)
                .outTime(outTime)
                .monthlyFee(calc.getMonthlyFee())
                .discountAmount(discountAmount)
                .admissionFee(admissionFee)
                .effectiveFromDate(request.getJoiningDate())
                .effectiveToDate(null) // currently active
                .createdAt(LocalDateTime.now())
                .build();

        StudentFeeConfig savedConfig = feeConfigRepository.save(config);
        log.info("Saved fee config id={} for regNo={}", savedConfig.getConfigId(), request.getRegNo());

        // ── Check month record doesn't already exist ──────────────────
        int feeMonth = request.getJoiningDate().getMonthValue();
        int feeYear  = request.getJoiningDate().getYear();

        if (feeRecordRepository.existsByRegNoAndFeeMonthAndFeeYear(
                request.getRegNo(), feeMonth, feeYear))
            throw new InvalidRequestException(
                    "Fee already locked for RegNo " + request.getRegNo()
                            + " for " + feeMonth + "/" + feeYear + ". Use payment page to pay.");

        // ── Save FeeRecord ────────────────────────────────────────────
        FeeRecord record = FeeRecord.builder()
                .regNo(request.getRegNo())
                .configId(savedConfig.getConfigId())
                .feeMonth(feeMonth).feeYear(feeYear)
                .inTime(inTime).outTime(outTime)
                .totalDaysInMonth(calc.getTotalDaysInMonth())
                .applicableDays(calc.getApplicableDays())
                .joiningDateInMonth(request.getJoiningDate())
                .monthlyFee(calc.getMonthlyFee())
                .proratedFee(calc.getProratedFee())
                .admissionFee(admissionFee)
                .discountAmount(calc.getDiscountAmount())
                .finalFee(calc.getFinalFee())
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(calc.getFinalFee())
                .paymentStatus("PENDING")
                .remarks(request.getRemarks())
                .createdAt(LocalDateTime.now())
                .build();

        FeeRecord saved = feeRecordRepository.save(record);
        log.info("Fee locked: feeId={}, regNo={}, finalFee={}", saved.getFeeId(), saved.getRegNo(), saved.getFinalFee());

        calc.setFeeId(saved.getFeeId());
        calc.setRegNo(saved.getRegNo());
        calc.setStudentName(student.getName());
        calc.setLockedInDb(true);
        return calc;
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTO-GENERATE — Called when FeePayment page selects a student
    // Checks if current month fee_record exists; creates from config if not
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public FeeCalculateResponse autoGenerateCurrentMonthFee(Long regNo) {

        Student student = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found."));

        if (!student.getIsActive())
            throw new InvalidRequestException("Student " + regNo + " is inactive.");

        // Must have a config — means fee was locked at admission
        StudentFeeConfig config = feeConfigRepository
                .findByRegNoAndEffectiveToDateIsNull(regNo)
                .orElseThrow(() -> new InvalidRequestException(
                        "No fee config found for RegNo " + regNo
                        + ". Please lock fee first on the Fee Calculate page."));

        LocalDate today    = LocalDate.now();
        int currentMonth   = today.getMonthValue();
        int currentYear    = today.getYear();

        // If record already exists for this month, nothing to do
        if (feeRecordRepository.existsByRegNoAndFeeMonthAndFeeYear(regNo, currentMonth, currentYear)) {
            log.info("Fee record already exists for regNo={} for {}/{}", regNo, currentMonth, currentYear);
            return null; // caller handles this — just fetch existing records
        }

        // Auto-generate: always full month, no admission fee, use 1st of month as joining date
        LocalDate firstOfMonth = LocalDate.of(currentYear, currentMonth, 1);

        FeeCalculateResponse calc = calculateFeeInternal(
                config.getInTime().format(TIME_FMT),
                config.getOutTime().format(TIME_FMT),
                firstOfMonth,
                config.getDiscountAmount(),
                BigDecimal.ZERO); // NO admission fee from month 2 onwards

        FeeRecord record = FeeRecord.builder()
                .regNo(regNo)
                .configId(config.getConfigId())
                .feeMonth(currentMonth).feeYear(currentYear)
                .inTime(config.getInTime()).outTime(config.getOutTime())
                .totalDaysInMonth(calc.getTotalDaysInMonth())
                .applicableDays(calc.getApplicableDays())
                .joiningDateInMonth(firstOfMonth)
                .monthlyFee(calc.getMonthlyFee())
                .proratedFee(calc.getProratedFee())
                .admissionFee(BigDecimal.ZERO)
                .discountAmount(calc.getDiscountAmount())
                .finalFee(calc.getFinalFee())
                .paidAmount(BigDecimal.ZERO)
                .balanceAmount(calc.getFinalFee())
                .paymentStatus("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

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
    // RECORD PAYMENT — Partial or Full
    // ═══════════════════════════════════════════════════════════════════
    @Transactional
    public FeePaymentResponse recordPayment(FeePaymentRequest request) {
        log.info("Payment: regNo={}, month={}/{}, amount={}",
                request.getRegNo(), request.getFeeMonth(), request.getFeeYear(), request.getPayAmount());

        String mode = request.getPaymentMode().toUpperCase();
        if (!"CASH".equals(mode) && !"ONLINE".equals(mode))
            throw new InvalidRequestException("paymentMode must be CASH or ONLINE");

        Student student = studentRepository.findById(request.getRegNo())
                .orElseThrow(() -> new StudentNotFoundException(
                        "Student " + request.getRegNo() + " not found."));

        FeeRecord record = feeRecordRepository
                .findByRegNoAndFeeMonthAndFeeYear(
                        request.getRegNo(), request.getFeeMonth(), request.getFeeYear())
                .orElseThrow(() -> new InvalidRequestException(
                        "No fee record found for RegNo " + request.getRegNo()
                        + " for " + request.getFeeMonth() + "/" + request.getFeeYear()
                        + ". Please lock fee first."));

        if ("PAID".equals(record.getPaymentStatus()))
            throw new InvalidRequestException("Fee already fully PAID.");

        BigDecimal payAmount = request.getPayAmount();
        if (payAmount.compareTo(BigDecimal.ZERO) <= 0)
            throw new InvalidRequestException("Amount must be > 0");
        if (payAmount.compareTo(record.getBalanceAmount()) > 0)
            throw new InvalidRequestException(
                    "Amount Rs." + payAmount + " exceeds balance Rs." + record.getBalanceAmount());

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
                .feeId(record.getFeeId())
                .regNo(record.getRegNo())
                .studentName(student.getName())
                .receiptNumber(receipt)
                .feeMonth(record.getFeeMonth()).feeYear(record.getFeeYear())
                .finalFee(record.getFinalFee())
                .amountPaidNow(payAmount)
                .totalPaidSoFar(newPaid)
                .balanceRemaining(newBalance)
                .paymentStatus(newStatus)
                .paymentMode(mode)
                .paymentDate(LocalDate.now().toString())
                .build();
    }
    // ═══════════════════════════════════════════════════════════════════
    // STUDENT FEE STATUS
    // ═══════════════════════════════════════════════════════════════════
     public StudentFeeStatusResponse getStudentFeeStatus(Long regNo) {

        Student student = studentRepository.findById(regNo)
                .orElseThrow(() -> new StudentNotFoundException("Student " + regNo + " not found."));

        List<FeeRecord> records = feeRecordRepository
                .findByRegNoOrderByFeeYearDescFeeMonthDesc(regNo);

        BigDecimal totalFee     = records.stream().map(FeeRecord::getFinalFee)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaid    = records.stream().map(FeeRecord::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalBalance = records.stream().map(FeeRecord::getBalanceAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Get current seat booking if any
        List<SeatBooking> bookings = seatBookingRepository
                .findByRegNoOrderBySeatNoAscStartTimeAsc(regNo);

        Integer seatNo   = bookings.isEmpty() ? null : bookings.get(0).getSeatNo();
        String timeSlot  = bookings.isEmpty() ? null :
                bookings.get(0).getStartTime().format(TIME_FMT)
                        + " - " + bookings.get(0).getEndTime().format(TIME_FMT);

        return StudentFeeStatusResponse.builder()
                .regNo(regNo)
                .studentName(student.getName())
                .gender(student.getGender())
                .mobile(student.getMobile())
                .isActive(student.getIsActive())
                .seatNo(seatNo)
                .timeSlot(timeSlot)
                .totalMonths(records.size())
                .totalFee(totalFee)
                .totalPaid(totalPaid)
                .totalBalance(totalBalance)
                .overallStatus(totalBalance.compareTo(BigDecimal.ZERO) <= 0 ? "ALL_PAID" : "HAS_PENDING")
                .monthlyRecords(records)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════
    // ALL STUDENTS FEE STATUS
    // ═══════════════════════════════════════════════════════════════════
    public AllStudentsFeeStatusResponse getAllStudentsFeeStatus(Integer month, Integer year) {
        List<FeeRecord> records = feeRecordRepository.findByFeeMonthAndFeeYear(month, year);

        long paid    = records.stream().filter(r -> "PAID".equals(r.getPaymentStatus())).count();
        long pending = records.stream().filter(r -> "PENDING".equals(r.getPaymentStatus())).count();
        long partial = records.stream().filter(r -> "PARTIAL".equals(r.getPaymentStatus())).count();

        BigDecimal totalExpected  = records.stream().map(FeeRecord::getFinalFee).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCollected = records.stream().map(FeeRecord::getPaidAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalBalance   = records.stream().map(FeeRecord::getBalanceAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<AllStudentsFeeStatusResponse.StudentFeeDetail> students = records.stream()
                .map(r -> AllStudentsFeeStatusResponse.StudentFeeDetail.builder()
                        .regNo(r.getRegNo())
                        .studentName(studentRepository.findById(r.getRegNo())
                                .map(Student::getName).orElse("Unknown"))
                        .timeSlot(r.getInTime().format(TIME_FMT) + " - " + r.getOutTime().format(TIME_FMT))
                        .finalFee(r.getFinalFee()).paidAmount(r.getPaidAmount())
                        .balanceAmount(r.getBalanceAmount()).paymentStatus(r.getPaymentStatus())
                        .paymentMode(r.getPaymentMode()).receiptNumber(r.getReceiptNumber())
                        .build())
                .toList();

        return AllStudentsFeeStatusResponse.builder()
                .month(month).year(year).totalStudents(records.size())
                .paidCount(paid).pendingCount(pending).partialCount(partial)
                .totalFeeExpected(totalExpected).totalCollected(totalCollected).totalBalance(totalBalance)
                .students(students)
                .build();
    }

    // ═══════════════════════════════════════════════════════════════════
    // MONTHLY COLLECTION
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

    // ═══════════════════════════════════════════════════════════════════
    // DATE RANGE COLLECTION
    // ═══════════════════════════════════════════════════════════════════
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

    private String generateReceiptNumber(Integer month, Integer year) {
        long count = feeRecordRepository.countReceiptsByMonthAndYear(month, year);
        return String.format("REC-%d-%02d-%03d", year, month, count + 1);
    }
}
