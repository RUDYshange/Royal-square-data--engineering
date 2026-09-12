-- Operator accounts for the New-Mutual operations platform.
-- Backs the /users CRUD API (api/users.py) and the User Access screens.
--
-- Deliberately stores NO secrets: passwords/passkeys belong to the identity
-- provider (the auth portal's SSO/FIDO2 model), never in the warehouse.
-- Fresh installs get this via postgres/init; existing volumes apply it
-- manually:
--   docker exec -i rs-postgres psql -U rs -d royalsquare \
--     < postgres/init/03_app_users.sql

\connect royalsquare

CREATE TABLE IF NOT EXISTS ops.app_users (
    user_id       BIGSERIAL PRIMARY KEY,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    role          TEXT NOT NULL CHECK (role IN
                    ('assessor','senior_assessor','ops_lead','batch_engineer','risk_analyst')),
    province      TEXT NOT NULL DEFAULT 'Gauteng',
    status        TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','invited','suspended')),
    assigned_claims INT NOT NULL DEFAULT 0 CHECK (assigned_claims >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_users_role    ON ops.app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_status  ON ops.app_users(status);

-- The mock's seeded directory: the five operators the UI screens depict.
INSERT INTO ops.app_users (full_name, email, role, province, status, assigned_claims) VALUES
  ('Itumeleng Khumalo', 'itumeleng.k@new-mutual.co.za', 'ops_lead',        'Gauteng',       'active',   14),
  ('Sarah Jenkins',     's.jenkins@new-mutual.co.za',   'senior_assessor', 'Western Cape',  'active',    9),
  ('Tebogo Molefe',     't.molefe@new-mutual.co.za',    'assessor',        'KwaZulu-Natal', 'active',   21),
  ('Devon Vance',       'd.vance@new-mutual.co.za',     'batch_engineer',  'Gauteng',       'active',    0),
  ('Nthabiseng Dlamini','n.dlamini@new-mutual.co.za',   'risk_analyst',    'Western Cape',  'invited',   0)
ON CONFLICT (email) DO NOTHING;
