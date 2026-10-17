# High Level Design

## Kiến trúc đích (cuối Phase 8)

Sơ đồ: [03-diagrams/architecture.md](../03-diagrams/architecture.md)

## Vai trò từng thành phần

| Thành phần | Vai trò | Vào từ phase | Nếu chết thì sao |
|---|---|---|---|
| Spring Boot app | API, hot path `POST /reservations` | 1 | nginx loại khỏi upstream |
| PG primary | Source of truth, giữ invariant | 1 | **mất khả năng ghi** — không giảm cấp được |
| PG replica | Tách tải đọc | 2 | đọc fallback về primary, chậm hơn |
| Redis | Bộ đếm tồn, idempotency, cache, hàng chờ | 3-5 | fallback về `AtomicUpdateStrategy` ở DB |
| Kafka + Worker | Đẩy persist ra khỏi hot path | 5 | API chuyển sang ghi đồng bộ, p99 tăng |
| nginx | LB, nén, HTTP/2 | 8 | gọi trực tiếp 1 instance |
| Prometheus/Grafana/Jaeger | Đo lường | 0 | **không ảnh hưởng hot path** (thiết kế có chủ ý) |

Nguyên tắc: tầng đo lường **không được** nằm trên đường đi của request. Nếu Prometheus chết
mà API cũng chết thì bạn đã thiết kế sai.

## Phân tách đọc / ghi

```
ĐỌC  (99% lưu lượng)   catalog, tồn vé      → Caffeine → Redis → PG replica
GHI  (1%  lưu lượng)   giữ chỗ, xác nhận    → Redis (atomic) → Kafka → Worker → PG primary
```

Đây là quyết định kiến trúc trung tâm: hai đường đi **hoàn toàn khác nhau**, tối ưu bằng
kỹ thuật khác nhau, đo bằng metric khác nhau.

## Bản đồ bottleneck

Mỗi phase tấn công một nghẽn. Sơ đồ: [03-diagrams/bottleneck-map.md](../03-diagrams/bottleneck-map.md)

| # | Nghẽn | Biểu hiện trên Grafana | Phase |
|---|---|---|---|
| 1 | N+1 query, thiếu index | DB query time cao, QPS cao bất thường | 2 |
| 2 | Pool cạn | `hikaricp_connections_pending` > 0 | 2 |
| 3 | Lock trên 1 row inventory | p99 tăng tuyến tính theo concurrency | 3 |
| 4 | Đọc catalog đập vào DB | DB QPS cao, cache hit thấp | 4 |
| 5 | Nhận quá nhiều request | queue vô hạn, timeout cascade | 5 |
| 6 | GC pause | p99 răng cưa đúng nhịp GC | 6 |
| 7 | Shared bottleneck | thêm instance mà throughput không tăng | 8 |

## Mô hình nhất quán

| Dữ liệu | Nhất quán kiểu gì | Hệ quả chấp nhận |
|---|---|---|
| Số vé còn (Redis) | Strong trong Redis (Lua atomic) | — |
| Reservation trong DB | **Eventual** (qua Kafka) | client nhận 201 trước khi DB ghi xong |
| Catalog / giá | Eventual, TTL 60s | người dùng có thể thấy tồn cũ ≤ 60s |
| `oversell` | **Strong, tuyệt đối** | CHECK constraint ở DB là chốt cuối |

Đánh đổi quan trọng nhất: client nhận `201` trước khi DB ghi. Đổi latency lấy consistency.
Cái giá là **bắt buộc** phải có reconciliation job — không có thì Redis và DB sẽ lệch âm thầm.

## Phòng thủ nhiều lớp cho invariant

```
Lớp 1  Redis Lua         kiểm tra stock >= qty trước khi DECRBY
Lớp 2  SQL WHERE         reserved + sold + qty <= total
Lớp 3  CHECK constraint  reserved + sold <= total     ← chốt cuối, không bypass được
Lớp 4  Reconciliation    phát hiện lệch và báo động
Lớp 5  Metric + alert    inventory_oversell_total > 0 → báo ngay
```

Lớp 3 là lý do bạn **dám** tối ưu hung ở lớp 1-2. Không có nó thì mỗi lần tối ưu là một lần đánh cược.
