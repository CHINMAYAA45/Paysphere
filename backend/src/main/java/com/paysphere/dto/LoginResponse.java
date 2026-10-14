package com.paysphere.dto;

public record LoginResponse(String token, String tokenType, String email,
                            String role, long expiresInMs) {}