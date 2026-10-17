# Bản đồ bottleneck

Đây là bản đồ của cả dự án: mỗi phase tấn công một nghẽn khác nhau.

```mermaid
flowchart LR
    C["Client"] --> NG["nginx"]
    NG --> APP["App JVM"]
    APP --> POOL["HikariCP pool"]
    POOL --> PG[("Postgres")]
    APP --> RD[("Redis")]
    RD -. "warm / reconcile" .-> PG

    P5["PHASE 5<br/>admission control"] -.-> NG
    P6["PHASE 6<br/>JVM · GC · alloc"] -.-> APP
    P4["PHASE 4<br/>cache 2 tầng"] -.-> RD
    P2["PHASE 2<br/>index · pool sizing"] -.-> POOL
    P3["PHASE 3<br/>lock contention"] -.-> PG
```

## Nghẽn dịch chuyển như thế nào

Sửa một nghẽn thì nghẽn lộ ra ở chỗ khác. Đây là điều quan trọng nhất cần hiểu:

```mermaid
flowchart TB
    B1["Phase 1<br/>Nghẽn: lock + thiếu index<br/>~200 rps"]
    B2["Phase 2<br/>Nghẽn dịch sang: lock contention<br/>~600 rps"]
    B3["Phase 3<br/>Nghẽn dịch sang: đọc catalog<br/>~2.000 rps"]
    B4["Phase 4<br/>Nghẽn dịch sang: nhận quá nhiều<br/>~4.000 rps"]
    B5["Phase 5<br/>Nghẽn dịch sang: GC pause<br/>~5.000 rps"]
    B6["Phase 6-8<br/>Nghẽn dịch sang: Redis single-thread<br/>trần hệ thống"]

    B1 --> B2 --> B3 --> B4 --> B5 --> B6
```

Con số là **dự đoán**, không phải cam kết. Việc của bạn là đo xem thực tế khác bao nhiêu —
và chỗ khác nhiều nhất chính là chỗ bạn hiểu sai hệ thống.

## Nhận diện nghẽn qua Grafana

| Nghẽn | Dấu hiệu | Dashboard |
|---|---|---|
| Thiếu index / N+1 | DB query time cao + QPS cao bất thường | db-redis |
| Pool cạn | `hikaricp_connections_pending > 0` | db-redis |
| Lock contention | p99 **tăng tuyến tính** theo số VU | red |
| Cache miss | hit rate thấp + DB QPS cao | db-redis |
| Quá tải | queue depth tăng không ngừng, timeout cascade | business |
| GC | p99 **răng cưa** đúng nhịp GC pause | jvm |
| Shared bottleneck | thêm instance mà throughput phẳng | red |

**Mẹo đọc:** p99 tăng *tuyến tính* theo tải = tranh chấp (lock, single thread).
p99 *nhảy bậc* = tài nguyên cạn (pool, memory). p99 *răng cưa* = GC hoặc job định kỳ.
