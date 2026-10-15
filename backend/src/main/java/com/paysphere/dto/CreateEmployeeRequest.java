package com.paysphere.dto;

import com.paysphere.entity.Role;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateEmployeeRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Pattern(regexp = "^$|^[0-9+\\-() ]{7,20}$", message = "must be a valid phone number")
        String phone,
        @NotBlank @Size(max = 100) String department,
        @NotBlank @Size(max = 100) String designation,
        @NotNull LocalDate dateOfJoining,
        @NotNull @DecimalMin(value = "0.0") @Digits(integer = 10, fraction = 2) BigDecimal baseSalary,
        Role role) {}
