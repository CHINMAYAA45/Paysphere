package com.paysphere.dto;

import com.paysphere.entity.PayslipStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record MyDashboardResponse(
        String fullName,
        String employeeCode,
        String designation,
        String todayStatus,          // NOT_CHECKED_IN, CHECKED_IN or CHECKED_OUT
        LocalDateTime checkIn,
        LocalDateTime checkOut,
        int presentDaysThisMonth,
        int halfDaysThisMonth,
        List<LeaveBalanceResponse> leaveBalance,
        long pendingLeaves,
        LatestPayslip latestPayslip) {   // null when no payslip exists yet

    public record LatestPayslip(int year, int month, BigDecimal netSalary, PayslipStatus status) {}
}
