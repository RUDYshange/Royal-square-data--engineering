\connect royalsquare

INSERT INTO ops.products (product_code, product_name, category) VALUES
  ('LIFE-001','Whole Life Cover','life'),
  ('LIFE-002','Term Life 20yr','life'),
  ('STC-001','Motor Comprehensive','short_term'),
  ('STC-002','Household Contents','short_term'),
  ('INV-001','Retirement Annuity','investment');

-- 500 synthetic clients across SA provinces
INSERT INTO ops.clients (id_number_hash, first_name, last_name, email, province, risk_profile)
SELECT
  md5('client' || g),
  (ARRAY['Thabo','Lerato','Sipho','Naledi','Pieter','Anele','Zanele','Kabelo','Nomsa','Johan'])[1 + (g % 10)],
  (ARRAY['Shange','Dlamini','Botha','Nkosi','Mokoena','Naidoo','Van Wyk','Khumalo','Mahlangu','Sithole'])[1 + (g % 10)],
  'client' || g || '@example.co.za',
  (ARRAY['Gauteng','Western Cape','KwaZulu-Natal','Free State','Limpopo','Mpumalanga','North West','Eastern Cape','Northern Cape'])[1 + (g % 9)],
  (ARRAY['low','moderate','high'])[1 + (g % 3)]
FROM generate_series(1, 500) g;

-- ~1.5 policies per client
INSERT INTO ops.policies (client_id, product_id, policy_number, premium_amount, status, inception_date)
SELECT
  1 + (g % 500),
  1 + (g % 5),
  'POL-' || lpad(g::text, 6, '0'),
  round((250 + random() * 3500)::numeric, 2),
  (ARRAY['active','active','active','lapsed','cancelled'])[1 + (g % 5)],
  DATE '2021-01-01' + (g % 1500)
FROM generate_series(1, 750) g;

-- claims on roughly a fifth of policies
INSERT INTO ops.claims (policy_id, claim_amount, stage, lodged_at)
SELECT
  1 + (g % 750),
  round((1000 + random() * 90000)::numeric, 2),
  (ARRAY['lodged','assessing','approved','rejected','paid'])[1 + (g % 5)],
  now() - ((g % 400) || ' days')::interval
FROM generate_series(1, 160) g;

-- payment history
INSERT INTO ops.premium_payments (policy_id, amount, paid_at, method)
SELECT
  1 + (g % 750),
  round((250 + random() * 3500)::numeric, 2),
  now() - ((g % 720) || ' days')::interval,
  (ARRAY['debit_order','debit_order','eft','card'])[1 + (g % 4)]
FROM generate_series(1, 6000) g;
