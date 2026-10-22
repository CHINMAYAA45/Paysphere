package com.paysphere.dto;

import com.paysphere.entity.Payslip;
import com.paysphere.entity.PayslipStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PayslipResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        String department,
        String designation,
        int year,
        int month,
        int workingDays,
        int presentDays,
        int halfDays,
        int leaveDays,
        BigDecimal lopDays,
        BigDecimal grossSalary,
        BigDecimal lopDeduction,
        BigDecimal earnedGross,
        BigDecimal basic,
        BigDecimal hra,
        BigDecimal specialAllowance,
        BigDecimal pf,
        BigDecimal professionalTax,
        BigDecimal incomeTax,
        BigDecimal totalDeductions,
        BigDecimal netSalary,
        PayslipStatus status,
        LocalDateTime generatedAt,
        LocalDateTime paidAt) {

    // Call inside a @Transactional method (the employee is loaded lazily).
    public static PayslipResponse from(Payslip p) {
        var e = p.getEmployee();
        return new PayslipResponse(
                p.getId(), e.getId(), e.getEmployeeCode(),
                e.getFirstName() + " " + e.getLastName(),
                e.getDepartment(), e.getDesignation(),
                p.getYear(), p.getMonth(),
                p.getWorkingDays(), p.getPresentDays(), p.getHalfDays(), p.getLeaveDays(), p.getLopDays(),
                p.getGrossSalary(), p.getLopDeduction(), p.getEarnedGross(),
                p.getBasic(), p.getHra(), p.getSpecialAllowance(),
                p.getPf(), p.getProfessionalTax(), p.getIncomeTax(),
                p.getTotalDeductions(), p.getNetSalary(),
                p.getStatus(), p.getGeneratedAt(), p.getPaidAt());
    }
}
