package com.paysphere.controller;

import com.paysphere.dto.AccountResponse;
import com.paysphere.repository.EmployeeRepository;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Replaces the temporary TestController. Works for every logged-in user,
// including the ADMIN, who has no employee profile.
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
@Tag(name = "Account")
@SecurityRequirement(name = "bearerAuth")
public class AccountController {

    private final EmployeeRepository employeeRepository;

    @GetMapping("/me")
    public AccountResponse me(Authentication auth) {
        String role = auth.getAuthorities().iterator().next()
                .getAuthority().replace("ROLE_", "");
        return employeeRepository.findByUserEmail(auth.getName())
                .map(e -> new AccountResponse(auth.getName(), role, e.getId(),
                        e.getFirstName() + " " + e.getLastName()))
                .orElseGet(() -> new AccountResponse(auth.getName(), role, null, null));
    }
}
