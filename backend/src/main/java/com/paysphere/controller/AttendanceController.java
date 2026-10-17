package com.paysphere.controller;

import com.paysphere.dto.AttendanceResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.service.AttendanceService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@Tag(name = "Attendance")
@SecurityRequirement(name = "bearerAuth")
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/check-in")
    @ResponseStatus(HttpStatus.CREATED)
    public AttendanceResponse checkIn(Authentication auth) {
        return attendanceService.checkIn(auth);
    }

    @PostMapping("/check-out")
    public AttendanceResponse checkOut(Authentication auth) {
        return attendanceService.checkOut(auth);
    }

    // 200 with today's record, or 204 if the user has not checked in yet.
    @GetMapping("/today")
    public ResponseEntity<AttendanceResponse> today(Authentication auth) {
        return attendanceService.today(auth)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    // My own records. Defaults: from = 1st of this month, to = today.
    @GetMapping("/me")
    public List<AttendanceResponse> mine(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            Authentication auth) {
        return attendanceService.myRecords(auth, from, to);
    }

    // Everyone's records (ADMIN / HR only).
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','HR')")
    public PageResponse<AttendanceResponse> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long employeeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return attendanceService.search(from, to, employeeId, page, size);
    }
}
