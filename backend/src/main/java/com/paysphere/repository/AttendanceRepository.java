package com.paysphere.repository;

import com.paysphere.entity.Attendance;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    Optional<Attendance> findByEmployeeIdAndWorkDate(Long employeeId, LocalDate workDate);

    List<Attendance> findByEmployeeIdAndWorkDateBetweenOrderByWorkDateDesc(
            Long employeeId, LocalDate from, LocalDate to);

    // employeeId = 0 means "all employees".
    @Query("""
            select a from Attendance a join a.employee e
            where a.workDate between :from and :to
              and (:employeeId = 0 or e.id = :employeeId)
            """)
    Page<Attendance> search(@Param("from") LocalDate from,
                            @Param("to") LocalDate to,
                            @Param("employeeId") long employeeId,
                            Pageable pageable);
}
