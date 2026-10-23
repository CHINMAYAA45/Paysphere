package com.paysphere.service;

import com.paysphere.dto.DashboardOverviewResponse;
import com.paysphere.dto.DashboardOverviewResponse.DepartmentCount;
import com.paysphere.dto.DashboardOverviewResponse.PayrollMonth;
import com.paysphere.dto.MyDashboardResponse;
import com.paysphere.dto.MyDashboardResponse.LatestPayslip;
import com.paysphere.entity.Attendance;
import com.paysphere.entity.AttendanceStatus;
import com.paysphere.entity.Employee;
import com.paysphere.entity.LeaveStatus;
import com.paysphere.entity.Payslip;
import com.paysphere.exception.BusinessException;
import com.paysphere.repository.AttendanceRepository;
import com.paysphere.repository.EmployeeRepository;
import com.paysphere.repository.LeaveRequestRepository;
import com.paysphere.repository.PayslipRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    @PersistenceContext
    private EntityManager em;

    private final EmployeeRepository employeeRepository;
    private final AttendanceRepository attendanceRepository;
    private final LeaveRequestRepository leaveRepository;
    private final PayslipRepository payslipRepository;
    private final LeaveService leaveService;

    @Transactional(readOnly = true)
    public DashboardOverviewResponse overview() {
        LocalDate today = LocalDate.now();

        long active = count("select count(e) from Employee e where e.status = com.paysphere.entity.EmployeeStatus.ACTIVE");
        long present = em.createQuery("select count(a) from Attendance a where a.workDate = :d", Long.class)
                .setParameter("d", today).getSingleResult();
        long half = em.createQuery(
                        "select count(a) from Attendance a where a.workDate = :d and a.status = com.paysphere.entity.AttendanceStatus.HALF_DAY",
                        Long.class)
                .setParameter("d", today).getSingleResult();
        long onLeave = em.createQuery("""
                        select count(distinct l.employee.id) from LeaveRequest l
                        where l.status = com.paysphere.entity.LeaveStatus.APPROVED
                          and l.startDate <= :d and l.endDate >= :d
                        """, Long.class)
                .setParameter("d", today).getSingleResult();
        long pending = count("select count(l) from LeaveRequest l where l.status = com.paysphere.entity.LeaveStatus.PENDING");

        List<DepartmentCount> departments = new ArrayList<>();
        List<Object[]> deptRows = em.createQuery("""
                select e.department, count(e) from Employee e
                where e.status = com.paysphere.entity.EmployeeStatus.ACTIVE
                group by e.department order by count(e) desc, e.department
                """, Object[].class).getResultList();
        for (Object[] row : deptRows) {
            departments.add(new DepartmentCount((String) row[0], (Long) row[1]));
        }

        List<Object[]> trendRows = em.createQuery("""
                select p.year, p.month, sum(p.netSalary), count(p),
                       sum(case when p.status = com.paysphere.entity.PayslipStatus.PAID then 1 else 0 end)
                from Payslip p
                group by p.year, p.month
                order by p.year desc, p.month desc
                """, Object[].class).setMaxResults(6).getResultList();
        List<PayrollMonth> trend = new ArrayList<>();
        for (Object[] row : trendRows) {
            trend.add(new PayrollMonth((Integer) row[0], (Integer) row[1], (BigDecimal) row[2],
                    (Long) row[3], ((Number) row[4]).longValue()));
        }
        Collections.reverse(trend); // oldest first, for a left-to-right chart

        return new DashboardOverviewResponse(active, present, half, onLeave, pending, departments, trend);
    }

    @Transactional(readOnly = true)
    public MyDashboardResponse me(Authentication auth) {
        Employee employee = employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Your account has no employee profile"));

        LocalDate today = LocalDate.now();
        Attendance todayRecord = attendanceRepository
                .findByEmployeeIdAndWorkDate(employee.getId(), today).orElse(null);
        String todayStatus = todayRecord == null ? "NOT_CHECKED_IN"
                : todayRecord.getCheckOut() == null ? "CHECKED_IN" : "CHECKED_OUT";

        List<Attendance> month = attendanceRepository.findByEmployeeIdAndWorkDateBetweenOrderByWorkDateDesc(
                employee.getId(), today.withDayOfMonth(1), today);
        int present = (int) month.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
        int half = (int) month.stream().filter(a -> a.getStatus() == AttendanceStatus.HALF_DAY).count();

        long pending = leaveRepository.findMine(employee.getId(), false, LeaveStatus.PENDING).size();

        Payslip latest = payslipRepository.findByEmployeeIdOrderByYearDescMonthDesc(employee.getId())
                .stream().findFirst().orElse(null);

        return new MyDashboardResponse(
                employee.getFirstName() + " " + employee.getLastName(),
                employee.getEmployeeCode(),
                employee.getDesignation(),
                todayStatus,
                todayRecord == null ? null : todayRecord.getCheckIn(),
                todayRecord == null ? null : todayRecord.getCheckOut(),
                present,
                half,
                leaveService.balance(auth),
                pending,
                latest == null ? null
                        : new LatestPayslip(latest.getYear(), latest.getMonth(), latest.getNetSalary(), latest.getStatus()));
    }

    private long count(String jpql) {
        return em.createQuery(jpql, Long.class).getSingleResult();
    }
}
