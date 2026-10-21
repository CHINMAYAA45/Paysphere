package com.paysphere.controller;

import com.paysphere.dto.CreateLeaveRequest;
import com.paysphere.dto.LeaveBalanceResponse;
import com.paysphere.dto.LeaveResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.dto.ReviewLeaveRequest;
import com.paysphere.entity.LeaveStatus;
import com.paysphere.service.LeaveService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaves")
@RequiredArgsConstructor
@Tag(name = "Leave")
@SecurityRequirement(name = "bearerAuth")
public class LeaveController {

    private final LeaveService leaveService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveResponse apply(@Valid @RequestBody CreateLeaveRequest request, Authentication auth) {
        return leaveService.apply(request, auth);
    }

    @GetMapping("/balance")
    public List<LeaveBalanceResponse> balance(Authentication auth) {
        return leaveService.balance(auth);
    }

    @GetMapping("/me")
    public List<LeaveResponse> mine(@RequestParam(required = false) LeaveStatus status, Authentication auth) {
        return leaveService.mine(status, auth);
    }

    @DeleteMapping("/{id}")
    public LeaveResponse cancel(@PathVariable Long id, Authentication auth) {
        return leaveService.cancel(id, auth);
    }

    // Everyone's requests (ADMIN / HR only).
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PageResponse<LeaveResponse> list(@RequestParam(required = false) LeaveStatus status,
                                            @RequestParam(required = false) Long employeeId,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return leaveService.search(status, employeeId, page, size);
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public LeaveResponse approve(@PathVariable Long id,
                                 @Valid @RequestBody(required = false) ReviewLeaveRequest body,
                                 Authentication auth) {
        return leaveService.approve(id, body == null ? null : body.comment(), auth);
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public LeaveResponse reject(@PathVariable Long id,
                                @Valid @RequestBody(required = false) ReviewLeaveRequest body,
                                Authentication auth) {
        return leaveService.reject(id, body == null ? null : body.comment(), auth);
    }
}
