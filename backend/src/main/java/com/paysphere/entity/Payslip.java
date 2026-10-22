package com.paysphere.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payslips")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payslip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false, updatable = false)
    private Employee employee;

    @Column(name = "pay_year", nullable = false, updatable = false)
    private int year;

    @Column(name = "pay_month", nullable = false, updatable = false)
    private int month;

    @Column(name = "working_days", nullable = false)
    private int workingDays;

    @Column(name = "present_days", nullable = false)
    private int presentDays;

    @Column(name = "half_days", nullable = false)
    private int halfDays;

    @Column(name = "leave_days", nullable = false)
    private int leaveDays;

    @Column(name = "lop_days", nullable = false, precision = 5, scale = 1)
    private BigDecimal lopDays;

    @Column(name = "gross_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal grossSalary;

    @Column(name = "lop_deduction", nullable = false, precision = 12, scale = 2)
    private BigDecimal lopDeduction;

    @Column(name = "earned_gross", nullable = false, precision = 12, scale = 2)
    private BigDecimal earnedGross;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal basic;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal hra;

    @Column(name = "special_allowance", nullable = false, precision = 12, scale = 2)
    private BigDecimal specialAllowance;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal pf;

    @Column(name = "professional_tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal professionalTax;

    @Column(name = "income_tax", nullable = false, precision = 12, scale = 2)
    private BigDecimal incomeTax;

    @Column(name = "total_deductions", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDeductions;

    @Column(name = "net_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal netSalary;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PayslipStatus status = PayslipStatus.GENERATED;

    @Column(name = "generated_at", nullable = false, updatable = false)
    private LocalDateTime generatedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @PrePersist
    void onCreate() {
        this.generatedAt = LocalDateTime.now();
    }
}
