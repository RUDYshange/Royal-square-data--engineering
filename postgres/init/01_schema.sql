-- Week 3: normalised OLTP schema (3NF) for the source system.
-- Domain deliberately familiar: brokerage clients, policies, claims, premiums.

CREATE DATABASE airflow;          -- Airflow metadata, kept off the business DB
\connect royalsquare

CREATE SCHEMA IF NOT EXISTS ops;        -- OLTP
CREATE SCHEMA IF NOT EXISTS analytics;  -- dbt target (warehouse layer)

CREATE TABLE ops.clients (
    client_id      BIGSERIAL PRIMARY KEY,
    id_number_hash TEXT        NOT NULL,          -- never store raw ID (POPIA)
    first_name     TEXT        NOT NULL,
    last_name      TEXT        NOT NULL,
    email          TEXT,
    province       TEXT        NOT NULL,
    risk_profile   TEXT        NOT NULL CHECK (risk_profile IN ('low','moderate','high')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ops.products (
    product_id   BIGSERIAL PRIMARY KEY,
    product_code TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    category     TEXT NOT NULL       -- life | short_term | investment
);

CREATE TABLE ops.policies (
    policy_id      BIGSERIAL PRIMARY KEY,
    client_id      BIGINT      NOT NULL REFERENCES ops.clients(client_id),
    product_id     BIGINT      NOT NULL REFERENCES ops.products(product_id),
    policy_number  TEXT        NOT NULL UNIQUE,
    premium_amount NUMERIC(12,2) NOT NULL CHECK (premium_amount >= 0),
    status         TEXT        NOT NULL CHECK (status IN ('active','lapsed','cancelled')),
    inception_date DATE        NOT NULL,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ops.claims (
    claim_id      BIGSERIAL PRIMARY KEY,
    policy_id     BIGINT      NOT NULL REFERENCES ops.policies(policy_id),
    claim_amount  NUMERIC(12,2) NOT NULL CHECK (claim_amount >= 0),
    stage         TEXT        NOT NULL CHECK (stage IN ('lodged','assessing','approved','rejected','paid')),
    lodged_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ops.premium_payments (
    payment_id  BIGSERIAL PRIMARY KEY,
    policy_id   BIGINT      NOT NULL REFERENCES ops.policies(policy_id),
    amount      NUMERIC(12,2) NOT NULL,
    paid_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    method      TEXT        NOT NULL   -- debit_order | eft | card
);

CREATE INDEX idx_policies_client ON ops.policies(client_id);
CREATE INDEX idx_claims_policy   ON ops.claims(policy_id);
CREATE INDEX idx_payments_policy ON ops.premium_payments(policy_id);

-- Debezium needs full row images to emit meaningful "before" state on UPDATE/DELETE
ALTER TABLE ops.clients          REPLICA IDENTITY FULL;
ALTER TABLE ops.policies         REPLICA IDENTITY FULL;
ALTER TABLE ops.claims           REPLICA IDENTITY FULL;
ALTER TABLE ops.premium_payments REPLICA IDENTITY FULL;
