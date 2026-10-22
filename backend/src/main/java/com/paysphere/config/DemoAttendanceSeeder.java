package com.paysphere.config;

import com.paysphere.entity.Attendance;
import com.paysphere.entity.AttendanceStatus;
import com.paysphere.entity.Employee;
import com.paysphere.entity.EmployeeStatus;
import com.paysphere.repository.AttendanceRepository;
import com.paysphere.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Demo data only: fills LAST month's attendance for every active employee so that a payroll run
 * has realistic numbers (a few absences and half days). Skips employees who already have records
 * for that month, and does nothing when app.seed-demo-users is false.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DemoAttendanceSeeder {

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;

    @Value("${app.seed-demo-users:false}")
    private boolean seedDemoUsers;

    // Runs after every CommandLineRunner (so after DataSeeder has created the demo employees).
    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        if (!seedDemoUsers) {
            return;
        }
        YearMonth month = YearMonth.now().minusMonths(1);
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();

        List<Employee> employees = employeeRepository.findAll().stream()
                .filter(e -> e.getStatus() == EmployeeStatus.ACTIVE)
                .sorted((a, b) -> Long.compare(a.getId(), b.getId()))
                .toList();

        int created = 0;
        for (int i = 0; i < employees.size(); i++) {
            Employee employee = employees.get(i);
            if (!attendanceRepository
                    .findByEmployeeIdAndWorkDateBetweenOrderByWorkDateDesc(employee.getId(), start, end).isEmpty()) {
                continue;
            }
            List<Attendance> records = new ArrayList<>();
            int weekday = 0;
            for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
                if (d.getDayOfWeek() == DayOfWeek.SATURDAY || d.getDayOfWeek() == DayOfWeek.SUNDAY) {
                    continue;
                }
                weekday++;
                if (d.isBefore(employee.getDateOfJoining())) {
                    continue;
                }
                if ((weekday + i * 7) % 11 == 0) {
                    continue; // absent (no record)
                }
                boolean halfDay = (weekday + i * 5) % 13 == 0;
                LocalDateTime in = LocalDateTime.of(d, LocalTime.of(9, 30));
                records.add(Attendance.builder()
                        .employee(employee)
                        .workDate(d)
                        .checkIn(in)
                        .checkOut(halfDay ? in.plusMinutes(195) : in.plusMinutes(540))
                        .status(halfDay ? AttendanceStatus.HALF_DAY : AttendanceStatus.PRESENT)
                        .build());
            }
            attendanceRepository.saveAll(records);
            created += records.size();
        }
        if (created > 0) {
            log.info("Seeded {} demo attendance records for {}", created, month);
        }
    }
}
