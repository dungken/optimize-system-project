# Phase 2 — Task breakdown

## Nhóm A — Chẩn đoán (làm hết trước khi sửa)

| ID | Task | Est | Output |
|---|---|---|---|
| P2-T01 | `ANALYZE` toàn DB sau seed, so planner before/after | 2h | bằng chứng statistics quan trọng |
| P2-T02 | `scripts/pg/explain.sh` — chạy `EXPLAIN (ANALYZE, BUFFERS)` mọi query hot path, lưu output | 3h | `results/phase-02-database/explain/*.txt` |
| P2-T03 | Bật `hibernate.generate_statistics` + `datasource-proxy`, đếm query/request | 3h | con số N+1 cụ thể |
| P2-T04 | Lập bảng "query nào chậm, vì sao, estimate vs actual" | 3h | ★ danh sách ưu tiên sửa |

## Nhóm B — Sửa N+1 (3 cách, đo cả 3)

| ID | Task | Est | Output |
|---|---|---|---|
| P2-T05 | Sửa bằng `JOIN FETCH`, đo | 3h | query/request, p99, bytes |
| P2-T06 | Sửa bằng `@EntityGraph`, đo | 2h | |
| P2-T07 | Sửa bằng **DTO projection** (native query), đo | 4h | |
| P2-T08 | Bảng so sánh 3 cách → chọn + lý do | 2h | ★ `n+1-comparison.md` |

## Nhóm C — Index (một index một commit)

| ID | Task | Est | Output |
|---|---|---|---|
| P2-T09 | `ticket_types(event_id)` — đo đọc + đo `INSERT` chậm đi % | 2h | |
| P2-T10 | `events(status, sale_starts_at)` — thử **cả 2 thứ tự cột**, đo | 3h | bài học selectivity |
| P2-T11 | `reservations(status, expires_at)` **partial** `WHERE status=0` — so với index đầy đủ về size + speed | 3h | ★ size chênh ~100× |
| P2-T12 | `orders(user_id, id DESC)` composite | 2h | |
| P2-T13 | Đo tổng chi phí ghi: seed 100k dòng có/không index | 2h | ★ index không miễn phí |

## Nhóm D — Pagination

| ID | Task | Est | Output |
|---|---|---|---|
| P2-T14 | Đo `OFFSET` ở trang 1 / 100 / 1.000 / 10.000 | 2h | đồ thị latency theo trang |
| P2-T15 | Đổi sang keyset pagination (cursor base64) | 4h | |
| P2-T16 | Đo lại cùng các trang → so sánh | 2h | ★ keyset phẳng, OFFSET tăng tuyến tính |

## Nhóm E — Connection pool

| ID | Task | Est | Output |
|---|---|---|---|
| P2-T17 | Tính pool size bằng Little's Law cho từng chiến lược | 2h | `capacity.md` đã có công thức |
| P2-T18 | Đo thực pool = 5/10/20/50/100 → `pool-sizing.csv` | 5h | ★ đồ thị throughput + p99 |
| P2-T19 | Chọn pool size + viết lý do (gồm vì sao không chọn cái lớn hơn) | 2h | ADR |

## Nhóm F — Replica & payload

| ID | Task | Est | Output |
|---|---|---|---|
| P2-T20 | `scripts/pg/setup-replica.sh` — `pg_basebackup` → cluster `:5433` | 4h | replica streaming |
| P2-T21 | `AbstractRoutingDataSource` — route `@Transactional(readOnly=true)` sang replica | 4h | |
| P2-T22 | Đo: tải đọc chuyển sang replica bao nhiêu %, primary nhẹ đi bao nhiêu | 3h | |
| P2-T23 | Đo replication lag dưới tải ghi cao | 2h | staleness của đường đọc |
| P2-T24 | DTO gọn thay entity ở mọi response, đo bytes/response | 3h | |

**Tổng ~72h ≈ 1,5 tuần**

## Thứ tự

```
A (T01-T04)  → chẩn đoán HẾT trước khi sửa
B (T05-T08)  → N+1 thường cho cải thiện lớn nhất
C (T09-T13)  → index, một cái một commit
D (T14-T16)  → pagination
E (T17-T19)  → pool
F (T20-T24)  → replica, payload
```

Nhóm A xong mới sửa. Sửa trước khi chẩn đoán = tối ưu theo cảm giác.
