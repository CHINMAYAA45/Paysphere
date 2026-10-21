package com.paysphere.entity;

public enum LeaveType {
    CASUAL(12),
    SICK(10),
    EARNED(15);

    private final int yearlyAllowance;

    LeaveType(int yearlyAllowance) {
        this.yearlyAllowance = yearlyAllowance;
    }

    public int getYearlyAllowance() {
        return yearlyAllowance;
    }
}
