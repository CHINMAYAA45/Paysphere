CREATE TABLE leave_requests (
    id             BIGSERIAL PRIMARY KEY,
    employee_id    BIGINT       NOT NULL REFERENCES employees (id),
    leave_type     VARCHAR(20)  NOT NULL CHECK (leave_type IN ('CASUAL', 'SICK', 'EARNED')),
    start_date     DATE         NOT NULL,
    end_date       DATE         NOT NULL,
    days           INT          NOT NULL CHECK (days > 0),
    reason         VARCHAR(500) NOT NULL,
    status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    reviewed_by    VARCHAR(255),
    review_comment VARCHAR(500),
    reviewed_at    TIMESTAMP,
    created_at     TIMESTAMP    NOT NULL,
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_employee ON leave_requests (employee_id);
CREATE INDEX idx_leave_status ON leave_requests (status);
