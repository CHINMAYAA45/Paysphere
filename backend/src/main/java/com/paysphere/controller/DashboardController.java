package com.paysphere.controller;

import com.paysphere.dto.DashboardOverviewResponse;
import com.paysphere.dto.MyDashboardResponse;
import com.paysphere.service.DashboardService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard")
@SecurityRequirement(name = "bearerAuth")
public class DashboardController {

    private final DashboardService dashboardService;

    // Company-wide numbers (ADMIN / HR only).
    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public DashboardOverviewResponse overview() {
        return dashboardService.overview();
    }

    // Personal numbers for anyone with an employee profile (EMPLOYEE and HR).
    @GetMapping("/me")
    public MyDashboardResponse me(Authentication auth) {
        return dashboardService.me(auth);
    }
}
