package com.paysphere.controller;

import com.paysphere.dto.GeneratePayrollRequest;
import com.paysphere.dto.GeneratePayrollResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.dto.PayslipResponse;
import com.paysphere.service.PayrollService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
@Tag(name = "Payroll")
@SecurityRequirement(name = "bearerAuth")
public class PayrollController {

    private final PayrollService payrollService;

    // Creates payslips for every active employee for a completed month. Safe to run twice.
    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public GeneratePayrollResponse generate(@Valid @RequestBody GeneratePayrollRequest request) {
        return payrollService.generate(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PageResponse<PayslipResponse> list(@RequestParam(required = false) Integer year,
                                              @RequestParam(required = false) Integer month,
                                              @RequestParam(required = false) Long employeeId,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return payrollService.search(year, month, employeeId, page, size);
    }

    // My own payslips (any employee, including HR).
    @GetMapping("/me")
    public List<PayslipResponse> mine(Authentication auth) {
        return payrollService.mine(auth);
    }

    // ADMIN/HR can open any payslip; everyone else only their own.
    @GetMapping("/{id}")
    public PayslipResponse get(@PathVariable Long id, Authentication auth) {
        return payrollService.get(id, auth);
    }

    @PatchMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PayslipResponse pay(@PathVariable Long id) {
        return payrollService.markPaid(id);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public void delete(@PathVariable Long id) {
        payrollService.delete(id);
    }
}
