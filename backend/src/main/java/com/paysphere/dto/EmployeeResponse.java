package com.paysphere.dto;

import com.paysphere.entity.Employee;
import com.paysphere.entity.EmployeeStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmployeeResponse(
        Long id,
        String employeeCode,
        String firstName,
        String lastName,
        String email,
        String phone,
        String department,
        String designation,
        LocalDate dateOfJoining,
        BigDecimal baseSalary,
        String role,
        EmployeeStatus status,
        LocalDateTime createdAt) {

    // Must be called while the Hibernate session is open (inside a @Transactional method),
    // because the user is loaded lazily.
    public static EmployeeResponse from(Employee e) {
        return new EmployeeResponse(
                e.getId(),
                e.getEmployeeCode(),
                e.getFirstName(),
                e.getLastName(),
                e.getUser().getEmail(),
                e.getPhone(),
                e.getDepartment(),
                e.getDesignation(),
                e.getDateOfJoining(),
                e.getBaseSalary(),
                e.getUser().getRole().name(),
                e.getStatus(),
                e.getCreatedAt());
    }
}
