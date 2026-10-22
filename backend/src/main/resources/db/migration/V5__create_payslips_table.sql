CREATE TABLE payslips (
    id                BIGSERIAL PRIMARY KEY,
    employee_id       BIGINT         NOT NULL REFERENCES employees (id),
    pay_year          INT            NOT NULL,
    pay_month         INT            NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
    working_days      INT            NOT NULL,
    present_days      INT            NOT NULL,
    half_days         INT            NOT NULL,
    leave_days        INT            NOT NULL,
    lop_days          NUMERIC(5, 1)  NOT NULL,
    gross_salary      NUMERIC(12, 2) NOT NULL,
    lop_deduction     NUMERIC(12, 2) NOT NULL,
    earned_gross      NUMERIC(12, 2) NOT NULL,
    basic             NUMERIC(12, 2) NOT NULL,
    hra               NUMERIC(12, 2) NOT NULL,
    special_allowance NUMERIC(12, 2) NOT NULL,
    pf                NUMERIC(12, 2) NOT NULL,
    professional_tax  NUMERIC(12, 2) NOT NULL,
    income_tax        NUMERIC(12, 2) NOT NULL,
    total_deductions  NUMERIC(12, 2) NOT NULL,
    net_salary        NUMERIC(12, 2) NOT NULL,
    status            VARCHAR(20)    NOT NULL DEFAULT 'GENERATED'
                      CHECK (status IN ('GENERATED', 'PAID')),
    generated_at      TIMESTAMP      NOT NULL,
    paid_at           TIMESTAMP,
    CONSTRAINT uq_payslip_employee_month UNIQUE (employee_id, pay_year, pay_month)
);

CREATE INDEX idx_payslips_period ON payslips (pay_year, pay_month);
