# Cache 2 tầng (Phase 4)

```mermaid
flowchart LR
    REQ["Request"] --> C1{"Caffeine<br/>in-process<br/>~100ns"}
    C1 -- hit --> OUT["Response"]
    C1 -- miss --> C2{"Redis<br/>~0,5ms"}
    C2 -- hit --> OUT
    C2 -- miss --> SF{"Single-flight<br/>lock"}
    SF -- "đã có người đi" --> WAIT["chờ kết quả"] --> OUT
    SF -- "mình đi" --> DB[("Postgres<br/>~5ms")]
    DB --> FILL["ghi lại cả 2 tầng<br/>TTL 60s ± jitter"]
    FILL --> OUT
```

## Vì sao 2 tầng chứ không phải 1

| | Caffeine | Redis |
|---|---|---|
| Độ trễ | ~100ns | ~500µs (×5000) |
| Phạm vi | 1 instance | chia sẻ 4 instance |
| Dung lượng | heap JVM | RAM riêng |
| Mất khi restart | có | không |
| Hot key | **giải quyết được** | vẫn dồn vào 1 node |

Caffeine giải quyết hot key: 1 event chiếm 90% traffic thì mỗi instance giữ bản sao riêng,
Redis không phải nhận 90% lưu lượng đó.

Cái giá: 4 instance có thể giữ 4 bản khác nhau trong ≤ TTL. Với catalog thì chấp nhận được,
với `stock` thì **không** — nên `stock` không bao giờ cache ở Caffeine.

## Ba vấn đề và cách đo

```mermaid
flowchart TB
    subgraph S["Stampede"]
        direction TB
        s1["TTL hết ĐỒNG LOẠT"] --> s2["1.000 request cùng miss"]
        s2 --> s3["1.000 query cùng lúc vào DB"]
        s3 --> s4["DB sập"]
    end
    subgraph P["Penetration"]
        direction TB
        p1["query ID không tồn tại"] --> p2["cache không bao giờ hit"]
        p2 --> p3["mọi request xuống DB"]
    end
    subgraph H["Hot key"]
        direction TB
        h1["1 event = 90% traffic"] --> h2["dồn vào 1 Redis node"]
        h2 --> h3["node đó nghẽn, các node khác rảnh"]
    end
```

| Vấn đề | Cách sửa | Cách đo hiệu quả |
|---|---|---|
| Stampede | single-flight lock **hoặc** probabilistic early expiration | DB QPS tại thời điểm TTL hết |
| Penetration | negative cache + bloom filter | DB QPS với 100% ID không tồn tại |
| Hot key | Caffeine local + TTL jitter | phân bố ops/s giữa các Redis node |

**Cách gây stampede để test:** `FLUSHDB` giữa lúc `load.js` đang chạy 500 VU, rồi xem
DB QPS trên Grafana. Không thấy đỉnh nhọn là chưa test đúng.

## TTL jitter

```
TTL = 60s + random(0, 15s)
```

Không có jitter: 1.000 key nạp cùng lúc → hết hạn cùng lúc → stampede lặp lại mỗi 60s.
Có jitter: trải ra 15s → DB nhận tải đều.

Một dòng code, loại bỏ hẳn một lớp vấn đề. Đây là loại tối ưu đáng làm trước tiên.
