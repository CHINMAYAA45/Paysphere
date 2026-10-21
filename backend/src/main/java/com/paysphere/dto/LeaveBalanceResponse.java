package com.paysphere.dto;

import com.paysphere.entity.LeaveType;

public record LeaveBalanceResponse(LeaveType leaveType, int allowed, long used, long remaining) {}
