# Phụ thuộc giữa package backend

```mermaid
flowchart TB
    API["api<br/>controller + dto"]
    STRAT["strategy<br/>ReserveStrategy ×5"]
    REPO["repo<br/>JPA + native dao"]
    RD[("Redis + Lua")]
    PG[("Postgres")]
    COMMON["common<br/>config · error · metrics · idempotency"]

    API --> STRAT
    STRAT --> REPO
    STRAT --> RD
    REPO --> PG
    COMMON -.-> API
    COMMON -.-> STRAT
    COMMON -.-> REPO
```

## Quy tắc

| Quy tắc | Vì sao |
|---|---|
| `common` không phụ thuộc domain nào | nếu có, nó thành thùng rác và mọi thứ phụ thuộc chéo |
| `catalog` và `reservation` không gọi nhau | hai đường đi (đọc/ghi) phải độc lập để tối ưu riêng |
| `api` → `strategy` → `repo`, không bao giờ `api` → `repo` | giữ hot path đi qua đúng một điểm đo |

## Tổ chức theo domain, không theo tầng

```mermaid
flowchart LR
    subgraph BAD["❌ theo tầng"]
        direction TB
        b1["controller/<br/>EventController<br/>ReservationController<br/>OrderController"]
        b2["service/<br/>EventService<br/>ReservationService<br/>OrderService"]
        b3["repository/<br/>..."]
        b1 --> b2 --> b3
    end
    subgraph GOOD["✅ theo domain"]
        direction TB
        g1["catalog/<br/>api · domain · repo · cache"]
        g2["reservation/<br/>api · domain · repo<br/>strategy · expiry"]
        g3["order/<br/>api · domain · repo"]
    end
```

Lý do cụ thể cho dự án này: khi profiler chỉ vào `reservation/`, bạn biết ngay phải đọc gì.
Với cách chia theo tầng, một thay đổi ở hot path phải sửa 3 thư mục cách xa nhau, và không
có chỗ nào tự nhiên để đặt `strategy/`.

Cấu trúc đầy đủ: [../../ROADMAP.md](../../ROADMAP.md)
