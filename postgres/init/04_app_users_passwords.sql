-- Adds password_hash to ops.app_users and seeds demo credentials.
-- Hashes are PBKDF2-SHA256, 200k iterations, format: hex(salt)$hex(dk).
-- The demo password for every seeded account is: OperatorSecretToken#2026
-- (login screen is pre-filled with it). NEVER reuse these hashes anywhere
-- outside local development.
--
-- Apply to an existing volume:
--   docker exec -i rs-postgres psql -U rs -d royalsquare \
--     < postgres/init/04_app_users_passwords.sql

\connect royalsquare

ALTER TABLE ops.app_users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE ops.app_users SET password_hash = CASE email
  WHEN 'itumeleng.k@new-mutual.co.za'
    THEN 'c57bc5868e6add71489eb1dc1d0dd8ed$aa03f41070c7d25d1d16007a423174f5741f586de0e8d4e13ce3530801d0c7e2'
  WHEN 's.jenkins@new-mutual.co.za'
    THEN 'c89922ef04c2f68e0c31b77c91631547$c82f108defe51f799b34ecad5fd3047b5484eacf048bb48ed7bfd296cc0a09bf'
  WHEN 't.molefe@new-mutual.co.za'
    THEN 'f5068b35d3f4ed1b4ac126be93f51754$baea98816ae5d68bcd98601d835c8401cfff02b4b550c0b3b4037fc337c6094c'
  WHEN 'd.vance@new-mutual.co.za'
    THEN 'a3dc9dac59f3b36c849bf7d96a76118e$cf200a6b90e2d4deec757c699d93f602678f4c87415158a8b6ba709b021bef8c'
END
WHERE email IN (
  'itumeleng.k@new-mutual.co.za',
  's.jenkins@new-mutual.co.za',
  't.molefe@new-mutual.co.za',
  'd.vance@new-mutual.co.za'
);
