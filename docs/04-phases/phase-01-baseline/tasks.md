# Phase 1 — Task breakdown

| ID | Task | Est | Phụ thuộc | Output |
|---|---|---|---|---|
| P1-T01 | Flyway `V1__schema.sql` — DDL 6 bảng + CHECK constraint | 3h | — | `make migrate` ok |
| P1-T02 | JPA entity: Event, TicketType, Inventory, Reservation, Order | 4h | T01 | |
| P1-T03 | `scripts/pg/seed.sql` — `generate_series`, 2M user + 5M order | 4h | T01 | `make seed` < 10 phút |
| P1-T04 | `scripts/pg/tune.sh` — hạ `shared_buffers` 256MB, `max_connections` | 1h | — | buộc IO thật |
| P1-T05 | `GET /events` — list, **OFFSET pagination**, trả full entity | 3h | T02 | cố tình chưa tối ưu |
| P1-T06 | `GET /events/{id}` — có ticketTypes, **lazy loading → N+1** | 2h | T02 | |
| P1-T07 | `POST /reservations` — `SELECT FOR UPDATE` + check + insert | 4h | T02 | hot path, bản ngây thơ |
| P1-T08 | `POST /orders` — xác nhận, chuyển `reserved→sold` | 3h | T07 | |
| P1-T09 | `GET /reservations/{id}` | 1h | T07 | |
| P1-T10 | `GlobalExceptionHandler` + `ApiError` + traceId trong body | 2h | T03 (P0) | lỗi có traceId khớp Jaeger |
| P1-T11 | `IdempotencyFilter` — bắt buộc header, chưa cần Redis | 2h | T07 | thiếu header → 400 |
| P1-T12 | Chạy `smoke.js` → sửa đến khi 0 lỗi | 2h | T05-T09 | API đúng trước khi đo tải |
| P1-T13 | Chạy `load.js` → ghi số | 2h | T12 | |
| P1-T14 | Chạy `spike.js` → ghi số, chụp Grafana | 3h | T12 | ★ số liệu chính |
| P1-T15 | Flame graph CPU + allocation tại tải đỉnh | 2h | T14 | 2 file HTML |
| P1-T16 | Viết `results/baseline.md` — bảng số + flame + screenshot + nhận định | 4h | T13-T15 | ★ **deliverable của phase** |

**Tổng ~42h ≈ 4 ngày**

## Thứ tự

```
T01 → T02 → T03 → T04        (data sẵn sàng)
    → T05 → T06 → T07 → T08 → T09   (API)
    → T10 → T11              (lỗi + idempotency)
    → T12                    (smoke pass = API đúng)
    → T13 → T14 → T15 → T16  (đo và ghi)
```

⚠️ **T12 phải pass trước khi đo tải.** Đo một API còn lỗi cho ra số liệu vô nghĩa —
bạn sẽ không biết p99 cao vì chậm hay vì đang throw exception.
