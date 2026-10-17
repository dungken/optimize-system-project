# Cài đặt native (không Docker)

## ⚠️ Hai việc phải xử lý trước Phase 1

### 1. Disk còn 12GB / 233GB (95% đầy)

Seed đầy đủ (10M users + 50M orders + index) cần ~16GB → **không đủ**.

| | 50M dòng | 5M dòng (đang dùng) |
|---|---|---|
| `orders` heap + index | ~9 GB | ~900 MB |
| `reservations` | ~4 GB | ~400 MB |
| `users` | ~1,5 GB | ~300 MB |
| WAL + temp | ~2 GB | ~500 MB |
| **tổng** | **~16 GB** ❌ | **~2 GB** ✅ |

**Bù lại:** hạ `shared_buffers` xuống 256MB → data vẫn lớn hơn cache ~8× nên seq scan vs
index scan vẫn khác biệt rõ. Bài học không mất, chỉ số tuyệt đối khác.

Giải phóng được ~30GB thì nâng lại 10M/50M để thấy IO pattern thật.

### 2. Node v18.19 — cần ≥ 20

Vite 5 chạy được trên Node 18, Vite 6+ không. Trước Phase 7:

```bash
nvm install 22 && nvm use 22
```

## Vì sao native tốt hơn Docker ở dự án này

Docker thêm ba nguồn nhiễu vào số đo:

| Nguồn | Ảnh hưởng |
|---|---|
| overlay-fs | write penalty — ảnh hưởng trực tiếp benchmark DB |
| bridge network NAT | thêm latency và biến thiên vào mọi request |
| cgroup accounting | CPU/memory số liệu lệch so với host thật |

Với dự án mà **số đo chính là sản phẩm**, native cho số sạch hơn.

Thêm nữa: `tc netem`, `systemd-run`, `kill -STOP` dạy bạn nhiều hơn `docker kill` —
đó là công cụ bạn dùng khi debug production thật.

## Đã có sẵn trên máy

| Thành phần | Phiên bản | Trạng thái |
|---|---|---|
| Java | 21.0.12 | ✅ |
| Maven | 3.8.7 | ✅ |
| PostgreSQL | 16.15 | ✅ `:5432` đang chạy (systemd) |
| Redis | 7.0.15 | ✅ `:6379` đang chạy (systemd) |
| Node | 18.19 | ⚠️ cần ≥20 trước Phase 7 |
| make, git, curl | | ✅ |

## Cần tải vào `tools/` (~300MB)

Chạy `scripts/install-tools.sh` — script in rõ URL + dung lượng trước mỗi lần tải.

| Binary | Dùng cho | ~Size |
|---|---|---|
| k6 | load test | 30 MB |
| prometheus | metrics | 100 MB |
| grafana (standalone) | dashboard | 110 MB |
| jaeger-all-in-one | tracing | 75 MB |
| async-profiler | flame graph | 5 MB |
| opentelemetry-javaagent.jar | auto-instrument | 20 MB |
| kafka (Phase 5) | message | 130 MB |

Tất cả là binary độc lập, **không cần root**, xoá `tools/` là sạch máy.

## Port map

| Thành phần | Port | Chạy bằng |
|---|---|---|
| PG primary | 5432 | systemd *(đang chạy)* |
| PG replica | 5433 | `scripts/pg/setup-replica.sh` |
| Redis | 6379 | systemd *(đang chạy)* |
| App | 8080-8083 | `java -jar ... --server.port=` |
| Prometheus | 9090 | `tools/prometheus/prometheus` |
| Grafana | 3000 | `tools/grafana/bin/grafana server` |
| Jaeger UI | 16686 | `tools/jaeger/jaeger-all-in-one` |
| Kafka | 9092 | `tools/kafka/bin/kafka-server-start.sh` |
| nginx | 80 | `apt install nginx` + systemd |
| Frontend dev | 5173 | `pnpm dev` |

## Tune PostgreSQL

`scripts/pg/tune.sh`:

```
shared_buffers = 256MB        # CỐ Ý nhỏ — buộc data lớn hơn cache
max_connections = 200         # đủ cho 4 instance × pool
work_mem = 8MB
effective_cache_size = 4GB
random_page_cost = 1.1        # SSD NVMe, không phải đĩa quay
track_io_timing = on          # BẮT BUỘC cho EXPLAIN (ANALYZE, BUFFERS)
```

`track_io_timing = on` là thứ nhiều người quên — không có nó thì `EXPLAIN BUFFERS` không
cho biết thời gian IO thật.

## Tune Redis

```
maxmemory 512mb
maxmemory-policy volatile-lru     # KHÔNG dùng allkeys-lru
```

⚠️ `allkeys-lru` có thể evict `stock:{ttId}` → Lua trả `-2` → API trả 503.
Đặt `stock:` vào Redis DB riêng (`SELECT 1`) với `noeviction`, hoặc dùng `volatile-lru`
và không set TTL cho `stock:`.

Đây là một trong những thứ chaos test ở Phase 3 phải bắt được.
