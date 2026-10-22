package com.paysphere.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure salary maths (no Spring, no database) so it is easy to read and test.
 *
 * Simplified rules used in this demo project:
 *  - Loss of pay = gross / working days in month * LOP days
 *  - Earned gross is split: Basic 50%, HRA 25%, Special allowance = the rest
 *  - PF = 12% of Basic
 *  - Professional tax = 200 per month when earned gross is above 15,000
 *  - Income tax (simplified) = 10% of the yearly amount above 7,00,000, spread over 12 months
 */
public final class PayrollCalculator {

    private static final BigDecimal PF_RATE = new BigDecimal("0.12");
    private static final BigDecimal PROFESSIONAL_TAX = new BigDecimal("200.00");
    private static final BigDecimal PT_THRESHOLD = new BigDecimal("15000");
    private static final BigDecimal TAX_FREE_YEARLY = new BigDecimal("700000");
    private static final BigDecimal TAX_RATE = new BigDecimal("0.10");

    private PayrollCalculator() {}

    public record Result(BigDecimal lopDeduction, BigDecimal earnedGross, BigDecimal basic,
                         BigDecimal hra, BigDecimal specialAllowance, BigDecimal pf,
                         BigDecimal professionalTax, BigDecimal incomeTax,
                         BigDecimal totalDeductions, BigDecimal netSalary) {}

    public static Result calculate(BigDecimal gross, int workingDays, BigDecimal lopDays) {
        BigDecimal lopDeduction = gross.multiply(lopDays)
                .divide(BigDecimal.valueOf(workingDays), 2, RoundingMode.HALF_UP);
        BigDecimal earned = gross.subtract(lopDeduction);

        BigDecimal basic = money(earned.multiply(new BigDecimal("0.50")));
        BigDecimal hra = money(earned.multiply(new BigDecimal("0.25")));
        BigDecimal special = earned.subtract(basic).subtract(hra);

        BigDecimal pf = money(basic.multiply(PF_RATE));
        BigDecimal pt = earned.compareTo(PT_THRESHOLD) > 0 ? PROFESSIONAL_TAX : BigDecimal.ZERO.setScale(2);

        BigDecimal yearly = earned.multiply(BigDecimal.valueOf(12));
        BigDecimal incomeTax = yearly.compareTo(TAX_FREE_YEARLY) > 0
                ? yearly.subtract(TAX_FREE_YEARLY).multiply(TAX_RATE)
                        .divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);

        BigDecimal totalDeductions = pf.add(pt).add(incomeTax);
        BigDecimal net = earned.subtract(totalDeductions);

        return new Result(lopDeduction, earned, basic, hra, special, pf, pt, incomeTax, totalDeductions, net);
    }

    private static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
