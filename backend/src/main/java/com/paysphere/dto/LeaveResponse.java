package com.paysphere.dto;

import com.paysphere.entity.LeaveRequest;
import com.paysphere.entity.LeaveStatus;
import com.paysphere.entity.LeaveType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record LeaveResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LeaveType leaveType,
        LocalDate startDate,
        LocalDate endDate,
        int days,
        String reason,
        LeaveStatus status,
        String reviewedBy,
        String reviewComment,
        LocalDateTime reviewedAt,
        LocalDateTime createdAt) {

    // Call inside a @Transactional method (the employee is loaded lazily).
    public static LeaveResponse from(LeaveRequest l) {
        return new LeaveResponse(
                l.getId(),
                l.getEmployee().getId(),
                l.getEmployee().getEmployeeCode(),
                l.getEmployee().getFirstName() + " " + l.getEmployee().getLastName(),
                l.getLeaveType(),
                l.getStartDate(),
                l.getEndDate(),
                l.getDays(),
                l.getReason(),
                l.getStatus(),
                l.getReviewedBy(),
                l.getReviewComment(),
                l.getReviewedAt(),
                l.getCreatedAt());
    }
}
