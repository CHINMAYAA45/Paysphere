package com.paysphere.repository;

import com.paysphere.entity.LeaveRequest;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

// Extra leave queries used by payroll (kept separate so LeaveRequestRepository is not changed).
public interface LeaveLookupRepository extends Repository<LeaveRequest, Long> {

    @Query("""
            select l from LeaveRequest l
            where l.employee.id = :employeeId
              and l.status = com.paysphere.entity.LeaveStatus.APPROVED
              and l.startDate <= :end and l.endDate >= :start
            """)
    List<LeaveRequest> findApprovedOverlapping(@Param("employeeId") Long employeeId,
                                               @Param("start") LocalDate start,
                                               @Param("end") LocalDate end);
}
