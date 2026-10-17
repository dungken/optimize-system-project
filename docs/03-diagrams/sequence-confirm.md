# Luồng xác nhận đơn

Chuyển `HELD` → `CONFIRMED` và tạo order.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as App
    participant P as Postgres
    participant PAY as Payment (mock)
    participant R as Redis

    C->>A: POST /orders {resId, paymentToken}
    A->>P: SELECT * FROM reservations WHERE id = :resId

    alt không tồn tại
        A-->>C: 404
    else status != HELD
        Note over A: EXPIRED / CANCELLED / đã có order
        A-->>C: 409 RESERVATION_NOT_HELD
    else expires_at < now()
        A-->>C: 409 RESERVATION_EXPIRED
    end

    A->>PAY: charge(amount, token)
    alt payment fail
        PAY-->>A: FAILED
        A->>P: UPDATE reservations SET status = CANCELLED
        A->>R: EVAL release.lua — trả vé
        A-->>C: 402 PAYMENT_FAILED
    else payment timeout
        Note over A,PAY: circuit breaker mở sau N lần fail
        A-->>C: 503 TRY_AGAIN
    else payment ok
        PAY-->>A: PAID
    end

    A->>P: BEGIN
    A->>P: UPDATE inventory SET reserved = reserved - :qty,<br/>sold = sold + :qty WHERE ticket_type_id = :id
    A->>P: UPDATE reservations SET status = CONFIRMED
    A->>P: INSERT INTO orders (reservation_id, ...)
    A->>P: COMMIT
    Note over A,P: UNIQUE(reservation_id) chặn tạo 2 đơn<br/>từ cùng 1 giữ chỗ
    A-->>C: 201 {orderId, status: PAID}
```

## Vì sao `reserved--` và `sold++` cùng lúc

Invariant là `reserved + sold <= total`. Chuyển một vé từ "đang giữ" sang "đã bán" phải
**giữ nguyên tổng** — nếu làm hai câu lệnh riêng thì giữa chúng invariant bị phá tạm thời,
và một reservation khác chen vào sẽ thấy trạng thái sai.

Một `UPDATE` duy nhất, một transaction. Không tách.

## Bẫy: payment chậm

`paymentToken: "mock_slow"` sleep 2s. Nếu không có timeout:

```
2s × 1.000 request đồng thời = 1.000 connection bị giữ 2s
→ pool cạn → toàn bộ API chết, kể cả GET /events
```

Đây là lý do Phase 5 đặt **timeout ở mọi call ra ngoài** + bulkhead tách pool cho payment.
Một dependency chậm không được làm chết cả hệ thống.
