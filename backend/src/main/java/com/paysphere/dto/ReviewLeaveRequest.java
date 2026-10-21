package com.paysphere.dto;

import jakarta.validation.constraints.Size;

public record ReviewLeaveRequest(@Size(max = 500) String comment) {}
