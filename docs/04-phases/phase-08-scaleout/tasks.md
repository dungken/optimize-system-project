# Phase 8 — Task breakdown

## Nhóm A — Chạy nhiều instance

| ID | Task | Est | Output |
|---|---|---|---|
| P8-T01 | `scripts/run-cluster.sh` — 4 JVM, port 8080-8083 | 3h | |
| P8-T02 | nginx upstream + health check + `apt install nginx` | 4h | |
| P8-T03 | Kiểm stateless: tìm mọi state in-memory | 3h | ★ danh sách vấn đề |
| P8-T04 | Sửa scheduled job chạy trùng (Redis lock hoặc leader election) | 4h | ★ |
| P8-T05 | Prometheus scrape cả 4 instance, dashboard tổng hợp đúng | 3h | |
| P8-T06 | Sửa mọi panel `avg(p99)` → `histogram_quantile` trên sum rate | 3h | ★ p99 thật |

## Nhóm B — Tính lại capacity

| ID | Task | Est | Output |
|---|---|---|---|
| P8-T07 | Tính pool: 4 × ? ≤ `max_connections`. Điều chỉnh | 2h | |
| P8-T08 | Đo `max_connections` thật chịu được bao nhiêu trước khi PG chậm đi | 3h | |
| P8-T09 | *(tuỳ chọn)* PgBouncer — so sánh có/không | 4h | |

## Nhóm C — Scale test

| ID | Task | Est | Output |
|---|---|---|---|
| P8-T10 | Đo throughput + p99 ở 1 / 2 / 3 / 4 instance | 5h | ★ dữ liệu chính |
| P8-T11 | Vẽ đồ thị thực tế vs tuyến tính | 2h | |
| P8-T12 | Tìm shared bottleneck: tài nguyên nào đạt 100% ở 4 instance | 4h | ★★ **kết luận phase** |
| P8-T13 | Chứng minh Redis là nghẽn: đo ops/s của Redis ở từng mức | 3h | |
| P8-T14 | Thử giảm số lệnh Redis/request → đo throughput tăng? | 4h | kiểm chứng giả thuyết |

## Nhóm D — Partition

| ID | Task | Est | Output |
|---|---|---|---|
| P8-T15 | `V3__partition_orders.sql` — `PARTITION BY RANGE (created_at)` | 4h | |
| P8-T16 | Đo partition pruning: query theo tháng, so trước/sau | 3h | |

## Nhóm E — Chaos ở quy mô cluster

| ID | Task | Est | Output |
|---|---|---|---|
| P8-T17 | `kill -STOP` 1 instance → nginx loại khỏi upstream? | 2h | |
| P8-T18 | `systemctl stop redis-server` → fallback hoạt động trên cả 4? | 3h | |
| P8-T19 | `tc netem delay 200ms` + `loss 5%` | 2h | |
| P8-T20 | `systemd-run -p MemoryMax=512M` → OOM behavior | 2h | |
| P8-T21 | `scripts/chaos/reset.sh` xác nhận hoàn tác sạch | 1h | ★ |
| P8-T22 | `results/phase-08-scaleout/scale-report.md` | 3h | |

**Tổng ~63h ≈ 1 tuần**
