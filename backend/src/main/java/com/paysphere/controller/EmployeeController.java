package com.paysphere.controller;

import com.paysphere.dto.CreateEmployeeRequest;
import com.paysphere.dto.EmployeeResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.dto.UpdateEmployeeRequest;
import com.paysphere.entity.EmployeeStatus;
import com.paysphere.service.EmployeeService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@Tag(name = "Employees")
@SecurityRequirement(name = "bearerAuth")
public class EmployeeController {

    private final EmployeeService employeeService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeResponse create(@Valid @RequestBody CreateEmployeeRequest request,
                                   Authentication auth) {
        return employeeService.create(request, auth);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PageResponse<EmployeeResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) EmployeeStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String dir) {
        return employeeService.search(search, department, status, page, size, sortBy, dir);
    }

    // Any logged-in user can see their own profile.
    @GetMapping("/me")
    public EmployeeResponse me(Authentication auth) {
        return employeeService.me(auth);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeResponse get(@PathVariable Long id) {
        return employeeService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeResponse update(@PathVariable Long id,
                                   @Valid @RequestBody UpdateEmployeeRequest request,
                                   Authentication auth) {
        return employeeService.update(id, request, auth);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeResponse deactivate(@PathVariable Long id, Authentication auth) {
        return employeeService.deactivate(id, auth);
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public EmployeeResponse activate(@PathVariable Long id, Authentication auth) {
        return employeeService.activate(id, auth);
    }
}
