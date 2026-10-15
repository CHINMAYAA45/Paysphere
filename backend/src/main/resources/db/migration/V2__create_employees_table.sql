CREATE SEQUENCE employee_code_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE employees (
    id              BIGSERIAL PRIMARY KEY,
    employee_code   VARCHAR(20)    NOT NULL UNIQUE,
    user_id         BIGINT         NOT NULL UNIQUE REFERENCES users (id),
    first_name      VARCHAR(100)   NOT NULL,
    last_name       VARCHAR(100)   NOT NULL,
    phone           VARCHAR(20),
    department      VARCHAR(100)   NOT NULL,
    designation     VARCHAR(100)   NOT NULL,
    date_of_joining DATE           NOT NULL,
    base_salary     NUMERIC(12, 2) NOT NULL CHECK (base_salary >= 0),
    status          VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_department ON employees (department);
CREATE INDEX idx_employees_status ON employees (status);
