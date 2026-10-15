package com.paysphere.service;

import com.paysphere.dto.CreateEmployeeRequest;
import com.paysphere.dto.EmployeeResponse;
import com.paysphere.dto.PageResponse;
import com.paysphere.dto.UpdateEmployeeRequest;
import com.paysphere.entity.Employee;
import com.paysphere.entity.EmployeeStatus;
import com.paysphere.entity.Role;
import com.paysphere.entity.User;
import com.paysphere.exception.BusinessException;
import com.paysphere.exception.ResourceNotFoundException;
import com.paysphere.repository.EmployeeRepository;
import com.paysphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    // Only these fields may be used for sorting (request value -> entity field).
    private static final Map<String, String> SORT_FIELDS = Map.of(
            "id", "id",
            "firstName", "firstName",
            "lastName", "lastName",
            "department", "department",
            "dateOfJoining", "dateOfJoining",
            "employeeCode", "employeeCode");

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public EmployeeResponse create(CreateEmployeeRequest req, Authentication auth) {
        Role role = req.role() == null ? Role.EMPLOYEE : req.role();
        if (role == Role.ADMIN) {
            throw new BusinessException("ADMIN accounts cannot be created here");
        }
        if (role == Role.HR && !isAdmin(auth)) {
            throw new AccessDeniedException("Only an ADMIN can create HR accounts");
        }

        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException("An account with this email already exists");
        }

        User user = userRepository.save(User.builder()
                .email(email)
                .password(passwordEncoder.encode(req.password()))
                .role(role)
                .build());

        Employee employee = Employee.builder()
                .employeeCode(Employee.codeFor(employeeRepository.nextCodeNumber()))
                .user(user)
                .firstName(req.firstName().trim())
                .lastName(req.lastName().trim())
                .phone(blankToNull(req.phone()))
                .department(req.department().trim())
                .designation(req.designation().trim())
                .dateOfJoining(req.dateOfJoining())
                .baseSalary(req.baseSalary())
                .build();

        return EmployeeResponse.from(employeeRepository.save(employee));
    }

    @Transactional(readOnly = true)
    public PageResponse<EmployeeResponse> search(String search, String department,
                                                 EmployeeStatus status, int page, int size,
                                                 String sortBy, String dir) {
        String sortField = SORT_FIELDS.get(sortBy == null ? "id" : sortBy);
        if (sortField == null) {
            throw new BusinessException("Cannot sort by '" + sortBy + "'. Allowed: "
                    + String.join(", ", SORT_FIELDS.keySet()));
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(
                Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(direction, sortField));

        String s = normalize(search);
        Page<Employee> result = employeeRepository.search(
                s, "%" + s + "%", normalize(department),
                status == null, status == null ? EmployeeStatus.ACTIVE : status, pageable);
        return PageResponse.from(result.map(EmployeeResponse::from));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse get(Long id) {
        return EmployeeResponse.from(find(id));
    }

    @Transactional(readOnly = true)
    public EmployeeResponse me(Authentication auth) {
        Employee employee = employeeRepository.findByUserEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No employee profile is linked to this account"));
        return EmployeeResponse.from(employee);
    }

    @Transactional
    public EmployeeResponse update(Long id, UpdateEmployeeRequest req, Authentication auth) {
        Employee employee = find(id);
        assertCanManage(employee, auth);

        employee.setFirstName(req.firstName().trim());
        employee.setLastName(req.lastName().trim());
        employee.setPhone(blankToNull(req.phone()));
        employee.setDepartment(req.department().trim());
        employee.setDesignation(req.designation().trim());
        employee.setDateOfJoining(req.dateOfJoining());
        employee.setBaseSalary(req.baseSalary());
        return EmployeeResponse.from(employee);
    }

    // "Delete" is a soft delete: the record is kept (payroll history needs it),
    // but the employee can no longer log in.
    @Transactional
    public EmployeeResponse deactivate(Long id, Authentication auth) {
        Employee employee = find(id);
        assertCanManage(employee, auth);
        if (employee.getUser().getEmail().equalsIgnoreCase(auth.getName())) {
            throw new BusinessException("You cannot deactivate your own account");
        }
        employee.setStatus(EmployeeStatus.INACTIVE);
        employee.getUser().setEnabled(false);
        return EmployeeResponse.from(employee);
    }

    @Transactional
    public EmployeeResponse activate(Long id, Authentication auth) {
        Employee employee = find(id);
        assertCanManage(employee, auth);
        employee.setStatus(EmployeeStatus.ACTIVE);
        employee.getUser().setEnabled(true);
        return EmployeeResponse.from(employee);
    }

    private Employee find(Long id) {
        return employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id " + id));
    }

    // HR can manage ordinary employees; only an ADMIN can manage HR accounts.
    private void assertCanManage(Employee target, Authentication auth) {
        if (target.getUser().getRole() != Role.EMPLOYEE && !isAdmin(auth)) {
            throw new AccessDeniedException("Only an ADMIN can manage HR accounts");
        }
    }

    private static boolean isAdmin(Authentication auth) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private static String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
