package com.paysphere.repository;

import com.paysphere.entity.LeaveRequest;
import com.paysphere.entity.LeaveStatus;
import com.paysphere.entity.LeaveType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    // allStatuses = true means "any status". employeeId = 0 means "all employees".
    @Query("""
            select l from LeaveRequest l join l.employee e
            where (:allStatuses = true or l.status = :status)
              and (:employeeId = 0 or e.id = :employeeId)
            """)
    Page<LeaveRequest> search(@Param("allStatuses") boolean allStatuses,
                              @Param("status") LeaveStatus status,
                              @Param("employeeId") long employeeId,
                              Pageable pageable);

    @Query("""
            select l from LeaveRequest l
            where l.employee.id = :employeeId
              and (:allStatuses = true or l.status = :status)
            order by l.startDate desc, l.id desc
            """)
    List<LeaveRequest> findMine(@Param("employeeId") Long employeeId,
                                @Param("allStatuses") boolean allStatuses,
                                @Param("status") LeaveStatus status);

    @Query("""
            select count(l) from LeaveRequest l
            where l.employee.id = :employeeId
              and l.status in :statuses
              and l.startDate <= :end and l.endDate >= :start
            """)
    long countOverlapping(@Param("employeeId") Long employeeId,
                          @Param("statuses") Collection<LeaveStatus> statuses,
                          @Param("start") LocalDate start,
                          @Param("end") LocalDate end);

    @Query("""
            select coalesce(sum(l.days), 0) from LeaveRequest l
            where l.employee.id = :employeeId
              and l.leaveType = :type
              and l.status in :statuses
              and l.startDate between :from and :to
            """)
    long sumDays(@Param("employeeId") Long employeeId,
                 @Param("type") LeaveType type,
                 @Param("statuses") Collection<LeaveStatus> statuses,
                 @Param("from") LocalDate from,
                 @Param("to") LocalDate to);
}
