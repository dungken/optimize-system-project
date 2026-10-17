# Phase 5 — Task breakdown

## Nhóm A — Rate limit & load shed

| ID | Task | Est | Output |
|---|---|---|---|
| P5-T01 | `RateLimitFilter` — Bucket4j + Redis, token bucket per user | 4h | |
| P5-T02 | Thêm rate limit per IP (chống 1 IP nhiều account) | 2h | |
| P5-T03 | `LoadShedFilter` — p99 nội bộ > ngưỡng → 503 nhanh | 4h | ★ |
| P5-T04 | Ngưỡng lấy từ p99 Phase 4 × 1,5, cấu hình được | 2h | |
| P5-T05 | `Retry-After` header trên mọi 429/503 | 2h | chống retry storm |
| P5-T06 | Đo: tải 10× → tỉ lệ 429/503/201, p99 của request được nhận | 4h | ★ |

## Nhóm B — Resilience

| ID | Task | Est | Output |
|---|---|---|---|
| P5-T07 | Resilience4j circuit breaker cho payment mock | 4h | |
| P5-T08 | Bulkhead — pool riêng cho payment, không dùng pool chính | 3h | ★ cô lập lỗi |
| P5-T09 | **Timeout ở mọi call ra ngoài** (DB, Redis, Kafka, payment) | 4h | |
| P5-T10 | Test: `mock_slow` 2s × 1.000 request → API khác vẫn sống | 3h | ★ chứng minh bulkhead |

## Nhóm C — Waiting room

| ID | Task | Est | Output |
|---|---|---|---|
| P5-T11 | `WaitingRoomService` — ZADD / ZRANK / ZPOPMIN | 4h | |
| P5-T12 | `GET /queue/{id}/position` — vị trí + ETA | 3h | |
| P5-T13 | `QueueSseController` — SSE push mỗi 2s | 5h | cần virtual threads |
| P5-T14 | Admission worker — nhả người theo throughput **đo được** từ Prometheus | 5h | ★ backpressure thật |
| P5-T15 | Token admit (`SETEX admit:{userId} 120`) + kiểm ở `POST /reservations` | 3h | |
| P5-T16 | Metric `queue_depth{eventId}` + panel Grafana | 2h | |
| P5-T17 | Đo: 50k VU → hàng chờ hoạt động, không ai timeout | 4h | |

## Nhóm D — Kafka async

| ID | Task | Est | Output |
|---|---|---|---|
| P5-T18 | Kafka KRaft mode (không ZooKeeper) vào `tools/` | 3h | |
| P5-T19 | Producer: `POST /reservations` chỉ enqueue | 4h | |
| P5-T20 | `ReservationConsumer` — idempotent (dùng `idempotency_key`) | 5h | ★ |
| P5-T21 | Poison message → DLQ, không block partition | 3h | |
| P5-T22 | Metric `kafka_consumer_lag` + alert | 2h | |
| P5-T23 | Đo p99 trước/sau khi ghi async | 3h | ★ |
| P5-T24 | Chaos: Kafka chết → API degrade sang ghi đồng bộ | 4h | |

**Tổng ~82h ≈ 1,5 tuần**
