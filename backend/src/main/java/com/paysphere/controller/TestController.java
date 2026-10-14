package com.paysphere.controller;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/test")
@SecurityRequirement(name = "bearerAuth")
public class TestController {

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth) {
        return Map.of("email", auth.getName(), "roles", auth.getAuthorities().toString());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminOnly() { return "Hello Admin"; }

    @GetMapping("/hr")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public String hrOrAdmin() { return "Hello HR/Admin"; }
}