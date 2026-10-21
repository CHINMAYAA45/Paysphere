package com.paysphere.service;

import com.paysphere.dto.CreateLeaveRequest;
import com.paysphere.dto.LeaveBalanceResponse;
import com.paysphere.dto.LeaveResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.entity.Employee;
import com.paysphere.entity.EmployeeStatus;
import com.paysphere.entity.LeaveRequest;
import com.paysphere.entity.LeaveStatus;
import com.paysphere.entity.LeaveType;
import com.paysphere.entity.Role;
import com.paysphere.exception.BusinessException;
import com.paysphere.exception.ResourceNotFoundException;
import com.paysphere.repository.EmployeeRepository;
import com.paysphere.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LeaveService {

    // Requests in these states use up balance and block overlapping requests.
    private static final Set<LeaveStatus> ACTIVE = Set.of(LeaveStatus.PENDING, LeaveStatus.APPROVED);

    private final LeaveRequestRepository leaveRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public LeaveResponse apply(CreateLeaveRequest req, Authentication auth) {
        Employee employee = currentEmployee(auth);
        LocalDate start = req.startDate();
        LocalDate end = req.endDate();

        if (end.isBefore(start)) {
            throw new BusinessException("End date must not be before the start date");
        }
        if (start.isBefore(LocalDate.now())) {
            throw new BusinessException("Leave cannot start in the past");
        }
        if (start.getYear() != end.getYear()) {
            throw new BusinessException("A leave request must be within one calendar year. Please split it.");
        }

        int days = workingDays(start, end);
        if (days == 0) {
            throw new BusinessException("The selected dates contain no working days (Mon–Fri)");
        }

        if (leaveRepository.countOverlapping(employee.getId(), ACTIVE, start, end) > 0) {
            throw new BusinessException("You already have a pending or approved leave overlapping these dates");
        }

        long remaining = remaining(employee.getId(), req.leaveType(), start.getYear());
        if (days > remaining) {
            throw new BusinessException("Insufficient " + req.leaveType() + " leave balance: requested "
                    + days + " day(s), remaining " + remaining);
        }

        LeaveRequest saved = leaveRepository.save(LeaveRequest.builder()
                .employee(employee)
                .leaveType(req.leaveType())
                .startDate(start)
                .endDate(end)
                .days(days)
                .reason(req.reason().trim())
                .build());
        return LeaveResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<LeaveBalanceResponse> balance(Authentication auth) {
        Employee employee = currentEmployee(auth);
        int year = LocalDate.now().getYear();
        return Arrays.stream(LeaveType.values()).map(type -> {
            long used = used(employee.getId(), type, year);
            return new LeaveBalanceResponse(type, type.getYearlyAllowance(), used,
                    Math.max(type.getYearlyAllowance() - used, 0));
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<LeaveResponse> mine(LeaveStatus status, Authentication auth) {
        Employee employee = currentEmployee(auth);
        return leaveRepository
                .findMine(employee.getId(), status == null, status == null ? LeaveStatus.PENDING : status)
                .stream().map(LeaveResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<LeaveResponse> search(LeaveStatus status, Long employeeId, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return PageResponse.from(leaveRepository
                .search(status == null, status == null ? LeaveStatus.PENDING : status,
                        employeeId == null ? 0L : employeeId, pageable)
                .map(LeaveResponse::from));
    }

    @Transactional
    public LeaveResponse cancel(Long id, Authentication auth) {
        Employee employee = currentEmployee(auth);
        LeaveRequest leave = find(id);
        if (!leave.getEmployee().getId().equals(employee.getId())) {
            throw new AccessDeniedException("You can only cancel your own leave requests");
        }
        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BusinessException("Only a PENDING request can be cancelled (this one is " + leave.getStatus() + ")");
        }
        leave.setStatus(LeaveStatus.CANCELLED);
        return LeaveResponse.from(leaveRepository.save(leave));
    }

    @Transactional
    public LeaveResponse approve(Long id, String comment, Authentication auth) {
        return review(id, LeaveStatus.APPROVED, comment, auth);
    }

    @Transactional
    public LeaveResponse reject(Long id, String comment, Authentication auth) {
        if (comment == null || comment.isBlank()) {
            throw new BusinessException("A comment is required when rejecting a request");
        }
        return review(id, LeaveStatus.REJECTED, comment, auth);
    }

    private LeaveResponse review(Long id, LeaveStatus decision, String comment, Authentication auth) {
        LeaveRequest leave = find(id);

        if (leave.getStatus() != LeaveStatus.PENDING) {
            throw new BusinessException("Only a PENDING request can be reviewed (this one is " + leave.getStatus() + ")");
        }
        if (leave.getEmployee().getUser().getEmail().equalsIgnoreCase(auth.getName())) {
            throw new BusinessException("You cannot review your own leave request");
        }
        // HR can review EMPLOYEE requests only; requests from HR need an ADMIN.
        if (leave.getEmployee().getUser().getRole() != Role.EMPLOYEE && !isAdmin(auth)) {
            throw new AccessDeniedException("Only an ADMIN can review requests from HR accounts");
        }

        leave.setStatus(decision);
        leave.setReviewedBy(auth.getName());
        leave.setReviewComment(comment == null || comment.isBlank() ? null : comment.trim());
        leave.setReviewedAt(LocalDateTime.now());
        return LeaveResponse.from(leaveRepository.save(leave));
    }

    private LeaveRequest find(Long id) {
        return leaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave request " + id + " not found"));
    }

    private long used(Long employeeId, LeaveType type, int year) {
        return leaveRepository.sumDays(employeeId, type, ACTIVE,
                LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    private long remaining(Long employeeId, LeaveType type, int year) {
        return Math.max(type.getYearlyAllowance() - used(employeeId, type, year), 0);
    }

    static int workingDays(LocalDate start, LocalDate end) {
        int count = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            DayOfWeek dow = d.getDayOfWeek();
            if (dow != DayOfWeek.SATURDAY && dow != DayOfWeek.SUNDAY) {
                count++;
            }
        }
        return count;
    }

    private boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private Employee currentEmployee(Authentication auth) {
        Employee employee = employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Your account has no employee profile"));
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new BusinessException("Your employee profile is inactive");
        }
        return employee;
    }
}
