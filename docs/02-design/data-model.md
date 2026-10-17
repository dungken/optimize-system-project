# Data model

ERD: [03-diagrams/erd.md](../03-diagrams/erd.md)

## DDL

Nguồn thật: `backend/src/main/resources/db/migration/V1__schema.sql`

```sql
CREATE TABLE events (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT        NOT NULL,
  venue           TEXT        NOT NULL,
  starts_at       TIMESTAMPTZ NOT NULL,
  sale_starts_at  TIMESTAMPTZ NOT NULL,
  status          SMALLINT    NOT NULL   -- 0 DRAFT 1 ON_SALE 2 SOLD_OUT 3 CLOSED
);

CREATE TABLE ticket_types (
  id          BIGSERIAL PRIMARY KEY,
  event_id    BIGINT NOT NULL REFERENCES events(id),
  name        TEXT   NOT NULL,
  price_cents BIGINT NOT NULL
);

-- Tách khỏi ticket_types: đây là HOT ROW.
CREATE TABLE inventory (
  ticket_type_id BIGINT PRIMARY KEY REFERENCES ticket_types(id),
  total          INT    NOT NULL,
  reserved       INT    NOT NULL DEFAULT 0,
  sold           INT    NOT NULL DEFAULT 0,
  version        BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT no_oversell CHECK (reserved + sold <= total)
);

CREATE TABLE reservations (
  id              BIGSERIAL PRIMARY KEY,
  idempotency_key UUID        NOT NULL UNIQUE,
  user_id         BIGINT      NOT NULL,
  ticket_type_id  BIGINT      NOT NULL REFERENCES ticket_types(id),
  qty             INT         NOT NULL CHECK (qty BETWEEN 1 AND 4),
  status          SMALLINT    NOT NULL,   -- 0 HELD 1 CONFIRMED 2 EXPIRED 3 CANCELLED
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id             BIGSERIAL PRIMARY KEY,
  reservation_id BIGINT      NOT NULL UNIQUE REFERENCES reservations(id),
  user_id        BIGINT      NOT NULL,
  amount_cents   BIGINT      NOT NULL,
  status         SMALLINT    NOT NULL,     -- 0 PENDING 1 PAID 2 FAILED
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Ba quyết định thiết kế quan trọng

### 1. `CHECK (reserved + sold <= total)` — invariant ở tầng DB
Dù Redis sai, code sai, race condition — Postgres vẫn từ chối. Đây là **lý do bạn dám tối ưu
hung ở tầng trên**. Chi phí: một phép so sánh integer mỗi lần UPDATE, không đáng kể.

ADR: [0001](../06-decisions/0001-check-constraint-giu-invariant.md)

### 2. Tách `inventory` khỏi `ticket_types` — cô lập hot row
`ticket_types` chứa `name`, `price` — đọc rất nhiều, gần như không đổi.
`inventory` chứa counter — ghi rất nhiều.

Để chung một bảng thì mỗi lần `UPDATE reserved` sẽ tạo row version mới, làm bẩn cache và
chặn các request đang đọc `name`/`price`. Tách ra → đường đọc và đường ghi không đụng nhau.

ADR: [0002](../06-decisions/0002-tach-inventory-khoi-ticket-types.md)

### 3. `SMALLINT` cho status thay vì enum/varchar
4 byte tiết kiệm × 5M dòng = 20MB, nhưng lý do thật là: index trên SMALLINT nhỏ hơn, nằm
trong cache tốt hơn. Trade-off: query thô khó đọc → bù bằng comment trong DDL và enum ở Java.

## Kế hoạch index

Phase 1 **cố tình không có** index nào ngoài PK. Thêm dần ở Phase 2, **đo từng cái**.

| Index | Phục vụ | Loại | Vì sao |
|---|---|---|---|
| `ticket_types(event_id)` | list vé của event | btree | sửa N+1 |
| `reservations(idempotency_key)` | tra idempotency | unique | có sẵn qua UNIQUE |
| `reservations(status, expires_at)` | job dọn HELD hết hạn | **partial** `WHERE status=0` | chỉ 1% dòng là HELD → index nhỏ hơn 100× |
| `orders(user_id, id DESC)` | lịch sử đơn | composite | keyset pagination, thay OFFSET |
| `events(status, sale_starts_at)` | trang chủ | composite | thứ tự cột theo selectivity |

**Mỗi index đo 2 chiều:** đọc nhanh hơn bao nhiêu **và** ghi chậm đi bao nhiêu %.
Index không miễn phí — đó là bài học của Phase 2.

## Khối lượng dữ liệu

| Bảng | Số dòng (dev) | Số dòng (lý tưởng) | Ghi chú |
|---|---|---|---|
| `users` | 2M | 10M | hạ xuống do disk — xem [setup-native.md](../05-runbook/setup-native.md) |
| `events` | 1.000 | 1.000 | |
| `ticket_types` | 4.000 | 4.000 | 4 loại/event |
| `inventory` | 4.000 | 4.000 | **1 row là hot row** |
| `orders` | 5M | 50M | lịch sử, để test pagination + partition |
| `reservations` | 5M | 50M | |

Seed bằng `generate_series` trong SQL thuần, **không** qua JPA.
Script: `scripts/pg/seed.sql`

## Partition (Phase 8)

```sql
-- orders phân vùng theo tháng
CREATE TABLE orders (...) PARTITION BY RANGE (created_at);
CREATE TABLE orders_2026_01 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

Đo: query theo khoảng thời gian nhanh hơn bao nhiêu nhờ partition pruning.
