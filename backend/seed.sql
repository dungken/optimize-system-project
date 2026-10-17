-- Task 0.3 — seed dữ liệu lab
-- Chạy: psql lab -f backend/seed.sql     (~1-2 phút)
--
-- generate_series trong SQL thuần, KHÔNG qua JPA.
-- Seed 2M dòng qua JPA mất nhiều giờ; cách này mất vài chục giây.

\timing on

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;

-- ───────────────────── customers: 200.000 ─────────────────────
CREATE TABLE customers (
  id   bigserial PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
);

INSERT INTO customers (name, city)
SELECT 'Khach hang ' || g,
       (ARRAY['Ha Noi','TP HCM','Da Nang','Hue','Can Tho'])[1 + (g % 5)]
FROM generate_series(1, 200000) g;

-- ───────────────────── orders: 2.000.000 ─────────────────────
CREATE TABLE orders (
  id           bigserial PRIMARY KEY,
  customer_id  bigint      NOT NULL REFERENCES customers(id),
  amount_cents bigint      NOT NULL,
  status       smallint    NOT NULL,   -- 0 PENDING  1 PAID  2 CANCELLED
  note         text,                   -- cột NẶNG, cố ý: để vòng 4 thấy payload khác biệt
  created_at   timestamptz NOT NULL
);

INSERT INTO orders (customer_id, amount_cents, status, note, created_at)
SELECT 1 + (random() * 199999)::bigint,
       (random() * 5000000)::bigint,
       (random() * 2)::smallint,
       'Ghi chu don hang ' || g || ' - ' || repeat('x', 400),
       now() - (random() * 365) * interval '1 day'
FROM generate_series(1, 2000000) g;

-- ⚠️ CỐ Ý KHÔNG tạo index nào ngoài PRIMARY KEY.
--    Vòng 1 sẽ thêm idx_orders_customer và đo khác biệt.
--    Thêm sẵn ở đây = mất bài học đầu tiên.

ANALYZE;   -- không có bước này, planner dùng statistics rỗng → chọn plan vô lý

-- ───────────────────── kiểm tra ─────────────────────
SELECT 'customers' AS bang, count(*) FROM customers
UNION ALL
SELECT 'orders', count(*) FROM orders;

SELECT relname AS bang,
       pg_size_pretty(pg_total_relation_size(relid)) AS tong,
       pg_size_pretty(pg_indexes_size(relid))        AS index
FROM pg_catalog.pg_statio_user_tables
WHERE relname IN ('orders','customers');

-- Index hiện có (phải CHỈ có 2 primary key)
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname='public' ORDER BY tablename;
