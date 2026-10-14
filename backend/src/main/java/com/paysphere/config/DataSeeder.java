package com.paysphere.config;

import com.paysphere.entity.Role;
import com.paysphere.entity.User;
import com.paysphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")     private String adminEmail;
    @Value("${app.admin.password}")  private String adminPassword;
    @Value("${app.seed-demo-users}") private boolean seedDemoUsers;

    @Override
    public void run(String... args) {
        createIfMissing(adminEmail, adminPassword, Role.ADMIN);
        if (seedDemoUsers) {
            createIfMissing("hr@paysphere.com", "Hr@12345", Role.HR);
            createIfMissing("employee@paysphere.com", "Emp@12345", Role.EMPLOYEE);
        }
    }

    private void createIfMissing(String email, String rawPassword, Role role) {
        if (userRepository.existsByEmail(email)) return;
        userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode(rawPassword))
                .role(role)
                .build());
        log.info("Seeded {} user: {}", role, email);
    }
}