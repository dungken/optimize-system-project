# Kiến trúc hệ thống

## Đích (cuối Phase 8)

```mermaid
flowchart TB
    FE["React + TypeScript<br/>:5173"]
    NG["nginx :80<br/>LB · brotli · HTTP/2"]

    subgraph APP["Application — Java 21 + Virtual Threads"]
        A1["app :8080"]
        A2["app :8081"]
        A3["app :8082"]
    end

    RD[("Redis :6379<br/>stock · idem · queue · cache")]
    KF["Kafka :9092<br/>order events"]
    WK["Worker JVM<br/>persist async + reconcile"]
    PGP[("PG primary :5432<br/>GHI — source of truth")]
    PGR[("PG replica :5433<br/>ĐỌC")]

    FE --> NG
    NG --> A1
    NG --> A2
    NG --> A3
    A1 --> RD
    A2 --> RD
    A3 --> RD
    A1 --> KF
    A2 --> KF
    A3 --> KF
    A1 -. "đọc catalog" .-> PGR
    KF --> WK
    WK --> PGP
    PGP -- "streaming WAL" --> PGR
```

## Tiến hoá qua các phase

```mermaid
flowchart LR
    subgraph P1["Phase 1 — ngây thơ"]
        direction TB
        a1["app"] --> d1[("PG")]
    end
    subgraph P2["Phase 2 — tách đọc/ghi"]
        direction TB
        a2["app"] --> d2[("PG primary")]
        a2 -.-> r2[("PG replica")]
    end
    subgraph P34["Phase 3-4 — Redis"]
        direction TB
        a3["app"] --> rd3[("Redis")]
        a3 --> d3[("PG")]
    end
    subgraph P58["Phase 5-8 — đủ"]
        direction TB
        n5["nginx"] --> a5["app ×4"]
        a5 --> rd5[("Redis")]
        a5 --> k5["Kafka"] --> w5["Worker"] --> d5[("PG")]
    end
    P1 --> P2 --> P34 --> P58
```

Mỗi mũi tên là một phase. Đừng dựng kiến trúc cuối ngay từ đầu — bạn sẽ không biết
thành phần nào thực sự cần thiết.

## Tầng đo lường (song song, KHÔNG trên hot path)

```mermaid
flowchart LR
    APP["app<br/>/actuator/prometheus"]
    PR["Prometheus :9090"]
    GF["Grafana :3000<br/>4 dashboard"]
    JG["Jaeger :16686"]
    AL["alerts.yml<br/>oversell > 0 → báo ngay"]
    K6["k6"]
    RS["results/*.json"]

    APP --> PR
    APP -- "OTel java agent" --> JG
    PR --> GF
    PR --> AL
    K6 -- "sinh tải" --> APP
    K6 --> RS
```

Thiết kế có chủ ý: Prometheus chết thì API vẫn chạy. Nếu không như vậy thì tầng đo lường
đã trở thành một nguồn lỗi mới.
