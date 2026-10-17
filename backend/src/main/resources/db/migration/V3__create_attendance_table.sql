CREATE TABLE attendance (
    id          BIGSERIAL PRIMARY KEY,
    employee_id BIGINT      NOT NULL REFERENCES employees (id),
    work_date   DATE        NOT NULL,
    check_in    TIMESTAMP   NOT NULL,
    check_out   TIMESTAMP,
    status      VARCHAR(20) NOT NULL DEFAULT 'PRESENT'
                CHECK (status IN ('PRESENT', 'HALF_DAY')),
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, work_date)
);

CREATE INDEX idx_attendance_work_date ON attendance (work_date);
