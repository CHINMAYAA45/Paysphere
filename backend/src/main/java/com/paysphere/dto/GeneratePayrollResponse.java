package com.paysphere.dto;

public record GeneratePayrollResponse(int year, int month, int generated,
                                      int alreadyExisted, int notYetJoined) {}
