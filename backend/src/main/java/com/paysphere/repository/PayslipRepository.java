package com.paysphere.repository;

import com.paysphere.entity.Payslip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PayslipRepository extends JpaRepository<Payslip, Long> {

    boolean existsByEmployeeIdAndYearAndMonth(Long employeeId, int year, int month);

    List<Payslip> findByEmployeeIdOrderByYearDescMonthDesc(Long employeeId);

    // 0 means "any" for year, month and employeeId.
    @Query("""
            select p from Payslip p join p.employee e
            where (:year = 0 or p.year = :year)
              and (:month = 0 or p.month = :month)
              and (:employeeId = 0 or e.id = :employeeId)
            """)
    Page<Payslip> search(@Param("year") int year,
                         @Param("month") int month,
                         @Param("employeeId") long employeeId,
                         Pageable pageable);
}
