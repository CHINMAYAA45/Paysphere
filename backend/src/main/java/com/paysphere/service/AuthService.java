package com.paysphere.service;

import com.paysphere.dto.LoginRequest;
import com.paysphere.dto.LoginResponse;
import com.paysphere.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        UserDetails user = (UserDetails) auth.getPrincipal();
        String token = jwtService.generateToken(user);
        String role = user.getAuthorities().iterator().next()
                .getAuthority().replace("ROLE_", "");

        return new LoginResponse(token, "Bearer", user.getUsername(),
                role, jwtService.getExpirationMs());
    }
}