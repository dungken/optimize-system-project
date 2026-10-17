# ERD

```mermaid
erDiagram
    EVENTS {
        bigint id PK
        text name
        text venue
        timestamptz starts_at
        timestamptz sale_starts_at
        smallint status "0 DRAFT 1 ON_SALE 2 SOLD_OUT 3 CLOSED"
    }
    TICKET_TYPES {
        bigint id PK
        bigint event_id FK
        text name
        bigint price_cents
    }
    INVENTORY {
        bigint ticket_type_id PK
        int total
        int reserved
        int sold
        bigint version "optimistic lock"
    }
    RESERVATIONS {
        bigint id PK
        uuid idempotency_key UK
        bigint user_id FK
        bigint ticket_type_id FK
        int qty "1..4"
        smallint status "0 HELD 1 CONFIRMED 2 EXPIRED 3 CANCELLED"
        timestamptz expires_at
        timestamptz created_at
    }
    ORDERS {
        bigint id PK
        bigint reservation_id FK,UK
        bigint user_id FK
        bigint amount_cents
        smallint status "0 PENDING 1 PAID 2 FAILED"
        timestamptz created_at
    }
    USERS {
        bigint id PK
        text email UK
    }

    EVENTS       ||--o{ TICKET_TYPES : "có nhiều loại vé"
    TICKET_TYPES ||--|| INVENTORY    : "HOT ROW — tách riêng"
    TICKET_TYPES ||--o{ RESERVATIONS : "được giữ chỗ"
    RESERVATIONS ||--o| ORDERS       : "xác nhận thành đơn"
    USERS        ||--o{ RESERVATIONS : "tạo"
    USERS        ||--o{ ORDERS       : "sở hữu"
```

## Hai điểm đáng chú ý trên ERD

**`TICKET_TYPES ||--|| INVENTORY` là 1-1** — nhìn qua thì vô lý, sao không gộp vào một bảng?

Vì `ticket_types` được **đọc** rất nhiều (name, price — gần như không đổi) còn `inventory`
được **ghi** rất nhiều (counter). Gộp lại thì mỗi `UPDATE reserved` tạo row version mới,
làm bẩn cache và chặn request đang đọc `price`. Tách ra là tối ưu, không phải chuẩn hoá.

**`RESERVATIONS ||--o| ORDERS` là 1-0..1** với `UNIQUE(reservation_id)` — một giữ chỗ sinh
tối đa một đơn. Đây là chốt chống tạo 2 đơn từ 1 giữ chỗ, ở tầng DB.

Chi tiết DDL: [../02-design/data-model.md](../02-design/data-model.md)
