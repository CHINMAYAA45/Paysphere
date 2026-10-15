package com.paysphere.repository;

import com.paysphere.entity.Employee;
import com.paysphere.entity.EmployeeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByUserEmail(String email);

    boolean existsByUserId(Long userId);

    @Query(value = "select nextval('employee_code_seq')", nativeQuery = true)
    Long nextCodeNumber();

    // Empty search/department means "no filter". allStatuses = true means "any status".
    @Query("""
            select e from Employee e join e.user u
            where (:search = ''
                   or lower(e.firstName) like :pattern
                   or lower(e.lastName) like :pattern
                   or lower(e.employeeCode) like :pattern
                   or lower(u.email) like :pattern
                   or lower(concat(e.firstName, ' ', e.lastName)) like :pattern)
              and (:department = '' or lower(e.department) = :department)
              and (:allStatuses = true or e.status = :status)
            """)
    Page<Employee> search(@Param("search") String search,
                          @Param("pattern") String pattern,
                          @Param("department") String department,
                          @Param("allStatuses") boolean allStatuses,
                          @Param("status") EmployeeStatus status,
                          Pageable pageable);
}
