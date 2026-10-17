# Luồng giữ chỗ — hot path ★

Đây là đường đi được tối ưu suốt cả dự án. Mọi phase đều chạm vào nó.

## Đích (sau Phase 5)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as App
    participant R as Redis
    participant K as Kafka
    participant W as Worker
    participant P as Postgres

    C->>A: POST /reservations {ttId, qty}<br/>+ header Idempotency-Key
    A->>R: GET rl:{userId} — token bucket
    alt vượt rate limit
        A-->>C: 429 + Retry-After
    end
    A->>A: load shed? p99 nội bộ > ngưỡng
    alt đang quá tải
        A-->>C: 503 fail fast
    end
    A->>R: EVAL reserve.lua [stock, idem] [qty, resId, ttl]
    alt hết vé (-1)
        R-->>A: -1
        A-->>C: 409 SOLD_OUT
    else replay (1)
        R-->>A: 1 + resId cũ
        A-->>C: 200 kết quả cũ
    else cache chưa warm (-2)
        R-->>A: -2
        A->>A: trigger warm từ DB
        A-->>C: 503 TRY_AGAIN
    else ok (0)
        R-->>A: 0 + resId
        A->>K: publish ReservationCreated
        A-->>C: 201 {resId, expiresAt}
    end
    K->>W: consume
    W->>P: INSERT reservation + UPDATE inventory
    Note over W,P: CHECK constraint chặn oversell<br/>nếu Redis và DB lệch
```

**Điểm then chốt:** client nhận `201` ở bước 18 — **trước khi** DB ghi xong ở bước 20.
Đổi latency lấy consistency. Cái giá là bắt buộc phải có reconciliation job.

## So sánh: Phase 1 (ngây thơ)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as App
    participant P as Postgres

    C->>A: POST /reservations
    A->>P: BEGIN
    A->>P: SELECT * FROM inventory<br/>WHERE ticket_type_id=? FOR UPDATE
    Note over A,P: ⚠️ 50.000 request xếp hàng<br/>trên ĐÚNG MỘT dòng
    P-->>A: row (sau khi chờ lock)
    A->>A: if (reserved + sold + qty > total) throw
    A->>P: UPDATE inventory SET reserved = reserved + ?
    A->>P: INSERT INTO reservations
    A->>P: COMMIT
    A-->>C: 201
```

4 round-trip trong một transaction giữ lock. Pool connection bị chiếm ~50ms mỗi request
→ cần pool 250 để đạt 5.000 rps → vượt `max_connections` của Postgres.

Tính toán: [../02-design/capacity.md](../02-design/capacity.md)

## Phase 3.3 — atomic UPDATE (winner ở tầng DB)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as App
    participant P as Postgres

    C->>A: POST /reservations
    A->>P: UPDATE inventory SET reserved = reserved + :qty<br/>WHERE ticket_type_id = :id<br/>AND reserved + sold + :qty <= total
    alt rowsAffected = 0
        P-->>A: 0
        A-->>C: 409 SOLD_OUT
    else rowsAffected = 1
        P-->>A: 1
        A->>P: INSERT INTO reservations
        A-->>C: 201
    end
```

Một câu lệnh, không round-trip, lock cực ngắn, invariant nằm ngay trong `WHERE`.
Từ 4 round-trip xuống 2, thời gian giữ connection từ ~50ms xuống ~2ms.
