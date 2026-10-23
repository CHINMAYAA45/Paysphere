package com.paysphere.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardOverviewResponse(
        long activeEmployees,
        long presentToday,
        long halfDayToday,
        long onLeaveToday,
        long pendingLeaves,
        List<DepartmentCount> departments,
        List<PayrollMonth> payrollTrend) {

    public record DepartmentCount(String department, long count) {}

    // One row per month that has payslips (most recent 6 months, oldest first).
    public record PayrollMonth(int year, int month, BigDecimal netTotal, long payslips, long paid) {}
}
