package com.paysphere.config;

import com.paysphere.entity.Employee;
import com.paysphere.entity.Role;
import com.paysphere.entity.User;
import com.paysphere.repository.EmployeeRepository;
import com.paysphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")     private String adminEmail;
    @Value("${app.admin.password}")  private String adminPassword;
    @Value("${app.seed-demo-users}") private boolean seedDemoUsers;

    @Override
    public void run(String... args) {
        // The admin is an account only; it has no employee profile.
        findOrCreateUser(adminEmail, adminPassword, Role.ADMIN);

        if (!seedDemoUsers) return;

        seedEmployee("hr@paysphere.com", "Hr@12345", Role.HR,
                "Hannah", "Roberts", "Human Resources", "HR Manager",
                "85000", LocalDate.of(2022, 3, 14));
        seedEmployee("employee@paysphere.com", "Emp@12345", Role.EMPLOYEE,
                "Evan", "Carter", "Engineering", "Software Engineer",
                "60000", LocalDate.of(2023, 6, 1));
        seedEmployee("priya.sharma@paysphere.com", "Emp@12345", Role.EMPLOYEE,
                "Priya", "Sharma", "Engineering", "Senior Developer",
                "95000", LocalDate.of(2021, 9, 20));
        seedEmployee("rahul.verma@paysphere.com", "Emp@12345", Role.EMPLOYEE,
                "Rahul", "Verma", "Finance", "Accountant",
                "55000", LocalDate.of(2022, 11, 7));
        seedEmployee("anita.desai@paysphere.com", "Emp@12345", Role.EMPLOYEE,
                "Anita", "Desai", "Sales", "Sales Executive",
                "48000", LocalDate.of(2023, 2, 13));
        seedEmployee("karan.mehta@paysphere.com", "Emp@12345", Role.EMPLOYEE,
                "Karan", "Mehta", "Marketing", "Content Strategist",
                "52000", LocalDate.of(2024, 1, 8));
    }

    private User findOrCreateUser(String email, String rawPassword, Role role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            User saved = userRepository.save(User.builder()
                    .email(email)
                    .password(passwordEncoder.encode(rawPassword))
                    .role(role)
                    .build());
            log.info("Seeded {} user: {}", role, email);
            return saved;
        });
    }

    private void seedEmployee(String email, String rawPassword, Role role,
                              String firstName, String lastName,
                              String department, String designation,
                              String salary, LocalDate joined) {
        User user = findOrCreateUser(email, rawPassword, role);
        if (employeeRepository.existsByUserId(user.getId())) return;

        employeeRepository.save(Employee.builder()
                .employeeCode(Employee.codeFor(employeeRepository.nextCodeNumber()))
                .user(user)
                .firstName(firstName)
                .lastName(lastName)
                .department(department)
                .designation(designation)
                .dateOfJoining(joined)
                .baseSalary(new BigDecimal(salary))
                .build());
        log.info("Seeded employee profile for {}", email);
    }
}
