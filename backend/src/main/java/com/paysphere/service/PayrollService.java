package com.paysphere.service;

import com.paysphere.dto.GeneratePayrollRequest;
import com.paysphere.dto.GeneratePayrollResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.dto.PayslipResponse;
import com.paysphere.entity.Attendance;
import com.paysphere.entity.AttendanceStatus;
import com.paysphere.entity.Employee;
import com.paysphere.entity.EmployeeStatus;
import com.paysphere.entity.LeaveRequest;
import com.paysphere.entity.Payslip;
import com.paysphere.entity.PayslipStatus;
import com.paysphere.exception.BusinessException;
import com.paysphere.exception.ResourceNotFoundException;
import com.paysphere.repository.AttendanceRepository;
import com.paysphere.repository.EmployeeRepository;
import com.paysphere.repository.LeaveLookupRepository;
import com.paysphere.repository.PayslipRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PayrollService {

    private final PayslipRepository payslipRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveLookupRepository leaveLookupRepository;

    @Transactional
    public GeneratePayrollResponse generate(GeneratePayrollRequest req) {
        YearMonth period = YearMonth.of(req.year(), req.month());
        if (!period.isBefore(YearMonth.now())) {
            throw new BusinessException("Payroll can only be generated for a completed month");
        }
        LocalDate start = period.atDay(1);
        LocalDate end = period.atEndOfMonth();

        int generated = 0;
        int existed = 0;
        int notJoined = 0;

        for (Employee employee : employeeRepository.findAll()) {
            if (employee.getStatus() != EmployeeStatus.ACTIVE) {
                continue;
            }
            if (employee.getDateOfJoining().isAfter(end)) {
                notJoined++;
                continue;
            }
            if (payslipRepository.existsByEmployeeIdAndYearAndMonth(employee.getId(), req.year(), req.month())) {
                existed++;
                continue;
            }
            payslipRepository.save(buildPayslip(employee, req.year(), req.month(), start, end));
            generated++;
        }
        return new GeneratePayrollResponse(req.year(), req.month(), generated, existed, notJoined);
    }

    private Payslip buildPayslip(Employee employee, int year, int month, LocalDate start, LocalDate end) {
        int workingDays = weekdaysBetween(start, end);
        LocalDate from = employee.getDateOfJoining().isAfter(start) ? employee.getDateOfJoining() : start;

        // Attendance by date (weekdays only).
        Map<LocalDate, AttendanceStatus> attendance = new HashMap<>();
        for (Attendance a : attendanceRepository
                .findByEmployeeIdAndWorkDateBetweenOrderByWorkDateDesc(employee.getId(), from, end)) {
            attendance.put(a.getWorkDate(), a.getStatus());
        }

        // Approved leave days (clipped to the period, weekdays only).
        Set<LocalDate> leaveDates = new HashSet<>();
        for (LeaveRequest l : leaveLookupRepository.findApprovedOverlapping(employee.getId(), from, end)) {
            LocalDate s = l.getStartDate().isBefore(from) ? from : l.getStartDate();
            LocalDate e = l.getEndDate().isAfter(end) ? end : l.getEndDate();
            for (LocalDate d = s; !d.isAfter(e); d = d.plusDays(1)) {
                if (isWeekday(d)) {
                    leaveDates.add(d);
                }
            }
        }

        int present = 0;
        int half = 0;
        int leave = 0;
        for (LocalDate d = from; !d.isAfter(end); d = d.plusDays(1)) {
            if (!isWeekday(d)) {
                continue;
            }
            if (leaveDates.contains(d)) {
                leave++;
            } else if (attendance.get(d) == AttendanceStatus.PRESENT) {
                present++;
            } else if (attendance.get(d) == AttendanceStatus.HALF_DAY) {
                half++;
            }
        }

        BigDecimal payable = BigDecimal.valueOf(present + leave)
                .add(BigDecimal.valueOf(half).multiply(new BigDecimal("0.5")));
        BigDecimal lopDays = BigDecimal.valueOf(workingDays).subtract(payable).setScale(1);

        PayrollCalculator.Result r = PayrollCalculator.calculate(employee.getBaseSalary(), workingDays, lopDays);

        return Payslip.builder()
                .employee(employee)
                .year(year)
                .month(month)
                .workingDays(workingDays)
                .presentDays(present)
                .halfDays(half)
                .leaveDays(leave)
                .lopDays(lopDays)
                .grossSalary(employee.getBaseSalary())
                .lopDeduction(r.lopDeduction())
                .earnedGross(r.earnedGross())
                .basic(r.basic())
                .hra(r.hra())
                .specialAllowance(r.specialAllowance())
                .pf(r.pf())
                .professionalTax(r.professionalTax())
                .incomeTax(r.incomeTax())
                .totalDeductions(r.totalDeductions())
                .netSalary(r.netSalary())
                .build();
    }

    @Transactional(readOnly = true)
    public PageResponse<PayslipResponse> search(Integer year, Integer month, Long employeeId, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Order.desc("year"), Sort.Order.desc("month"), Sort.Order.asc("id")));
        return PageResponse.from(payslipRepository
                .search(year == null ? 0 : year, month == null ? 0 : month,
                        employeeId == null ? 0L : employeeId, pageable)
                .map(PayslipResponse::from));
    }

    @Transactional(readOnly = true)
    public List<PayslipResponse> mine(Authentication auth) {
        Employee employee = employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Your account has no employee profile"));
        return payslipRepository.findByEmployeeIdOrderByYearDescMonthDesc(employee.getId())
                .stream().map(PayslipResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PayslipResponse get(Long id, Authentication auth) {
        Payslip payslip = find(id);
        boolean staff = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_HR"));
        boolean owner = payslip.getEmployee().getUser().getEmail().equalsIgnoreCase(auth.getName());
        if (!staff && !owner) {
            throw new AccessDeniedException("You can only view your own payslips");
        }
        return PayslipResponse.from(payslip);
    }

    @Transactional
    public PayslipResponse markPaid(Long id) {
        Payslip payslip = find(id);
        if (payslip.getStatus() != PayslipStatus.GENERATED) {
            throw new BusinessException("This payslip is already " + payslip.getStatus());
        }
        payslip.setStatus(PayslipStatus.PAID);
        payslip.setPaidAt(java.time.LocalDateTime.now());
        return PayslipResponse.from(payslipRepository.save(payslip));
    }

    // Lets HR regenerate a payslip after fixing attendance. Paid payslips are kept.
    @Transactional
    public void delete(Long id) {
        Payslip payslip = find(id);
        if (payslip.getStatus() != PayslipStatus.GENERATED) {
            throw new BusinessException("Paid payslips cannot be deleted");
        }
        payslipRepository.delete(payslip);
    }

    private Payslip find(Long id) {
        return payslipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payslip " + id + " not found"));
    }

    private static boolean isWeekday(LocalDate d) {
        return d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY;
    }

    static int weekdaysBetween(LocalDate start, LocalDate end) {
        int count = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (isWeekday(d)) {
                count++;
            }
        }
        return count;
    }
}
