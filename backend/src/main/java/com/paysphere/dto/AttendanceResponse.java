package com.paysphere.dto;

import com.paysphere.entity.Attendance;
import com.paysphere.entity.AttendanceStatus;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceResponse(
        Long id,
        Long employeeId,
        String employeeCode,
        String employeeName,
        LocalDate workDate,
        LocalDateTime checkIn,
        LocalDateTime checkOut,
        Long workedMinutes,
        AttendanceStatus status) {

    // Call inside a @Transactional method (the employee is loaded lazily).
    public static AttendanceResponse from(Attendance a) {
        Long minutes = a.getCheckOut() == null
                ? null
                : Duration.between(a.getCheckIn(), a.getCheckOut()).toMinutes();
        return new AttendanceResponse(
                a.getId(),
                a.getEmployee().getId(),
                a.getEmployee().getEmployeeCode(),
                a.getEmployee().getFirstName() + " " + a.getEmployee().getLastName(),
                a.getWorkDate(),
                a.getCheckIn(),
                a.getCheckOut(),
                minutes,
                a.getStatus());
    }
}
