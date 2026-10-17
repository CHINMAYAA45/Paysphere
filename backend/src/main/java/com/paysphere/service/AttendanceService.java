package com.paysphere.service;

import com.paysphere.dto.AttendanceResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.entity.Attendance;
import com.paysphere.entity.AttendanceStatus;
import com.paysphere.entity.Employee;
import com.paysphere.entity.EmployeeStatus;
import com.paysphere.exception.BusinessException;
import com.paysphere.repository.AttendanceRepository;
import com.paysphere.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    // Working fewer than 4 hours counts as a half day.
    static final long FULL_DAY_MINUTES = 240;
    private static final long MAX_RANGE_DAYS = 366;

    private final AttendanceRepository attendanceRepository;
    private final EmployeeRepository employeeRepository;

    @Transactional
    public AttendanceResponse checkIn(Authentication auth) {
        Employee employee = currentEmployee(auth);
        LocalDate today = LocalDate.now();

        if (attendanceRepository.findByEmployeeIdAndWorkDate(employee.getId(), today).isPresent()) {
            throw new BusinessException("You have already checked in today");
        }

        Attendance record = attendanceRepository.save(Attendance.builder()
                .employee(employee)
                .workDate(today)
                .checkIn(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS))
                .build());
        return AttendanceResponse.from(record);
    }

    @Transactional
    public AttendanceResponse checkOut(Authentication auth) {
        Employee employee = currentEmployee(auth);

        Attendance record = attendanceRepository
                .findByEmployeeIdAndWorkDate(employee.getId(), LocalDate.now())
                .orElseThrow(() -> new BusinessException("You have not checked in today"));
        if (record.getCheckOut() != null) {
            throw new BusinessException("You have already checked out today");
        }

        record.setCheckOut(LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS));
        long minutes = Duration.between(record.getCheckIn(), record.getCheckOut()).toMinutes();
        record.setStatus(minutes >= FULL_DAY_MINUTES ? AttendanceStatus.PRESENT : AttendanceStatus.HALF_DAY);
        return AttendanceResponse.from(attendanceRepository.save(record));
    }

    @Transactional(readOnly = true)
    public Optional<AttendanceResponse> today(Authentication auth) {
        Employee employee = currentEmployee(auth);
        return attendanceRepository
                .findByEmployeeIdAndWorkDate(employee.getId(), LocalDate.now())
                .map(AttendanceResponse::from);
    }

    @Transactional(readOnly = true)
    public List<AttendanceResponse> myRecords(Authentication auth, LocalDate from, LocalDate to) {
        Employee employee = currentEmployee(auth);
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.withDayOfMonth(1) : from;
        validateRange(start, end);

        return attendanceRepository
                .findByEmployeeIdAndWorkDateBetweenOrderByWorkDateDesc(employee.getId(), start, end)
                .stream().map(AttendanceResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<AttendanceResponse> search(LocalDate from, LocalDate to, Long employeeId,
                                                   int page, int size) {
        LocalDate end = to == null ? LocalDate.now() : to;
        LocalDate start = from == null ? end.withDayOfMonth(1) : from;
        validateRange(start, end);

        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Order.desc("workDate"), Sort.Order.asc("id")));
        return PageResponse.from(
                attendanceRepository.search(start, end, employeeId == null ? 0L : employeeId, pageable)
                        .map(AttendanceResponse::from));
    }

    private Employee currentEmployee(Authentication auth) {
        Employee employee = employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Your account has no employee profile"));
        if (employee.getStatus() != EmployeeStatus.ACTIVE) {
            throw new BusinessException("Your employee profile is inactive");
        }
        return employee;
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new BusinessException("'from' date must not be after 'to' date");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new BusinessException("Date range cannot be longer than one year");
        }
    }
}
