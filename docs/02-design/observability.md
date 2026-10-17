# Observability design

Nguyên tắc: tầng đo lường **không nằm trên hot path**. Prometheus chết thì API vẫn chạy.

## Metric catalog

### Correctness — mở đầu tiên khi chạy spike test

| Metric | Type | Ngưỡng báo động |
|---|---|---|
| `inventory_oversell_total` | counter | **> 0 → báo ngay** |
| `reservation_leaked_total` | counter | **> 0 → báo ngay** |
| `reconciliation_drift` | gauge | `> 0` kéo dài > 60s |
| `release_duplicate_total` | counter | > 0 = chốt SETNX đang làm việc |

Hai metric đầu trả lời câu **"hệ thống có đúng không"**. Mọi metric khác trả lời
"có nhanh không". Đúng quan trọng hơn.

### RED — mỗi endpoint

| Metric | Type | Dùng để |
|---|---|---|
| `http_server_requests_seconds` | histogram | **R**ate, **E**rror, **D**uration p50/95/99 |
| `reservation_attempts_total{result}` | counter | ok / soldout / duplicate / ratelimited |
| `reserve_strategy_duration{strategy}` | histogram | **so sánh 5 chiến lược Phase 3** |

`reserve_strategy_duration` có tag `strategy` chính là cách bạn A/B 5 implementation trên
cùng một dashboard.

### Resource

| Metric | Type | Đọc để biết |
|---|---|---|
| `hikaricp_connections_pending` | gauge | > 0 = **pool cạn**, dấu hiệu rõ nhất |
| `hikaricp_connections_active` | gauge | so với max để biết pool size đúng chưa |
| `jvm_gc_pause_seconds` | histogram | p99 răng cưa do GC |
| `jvm_memory_allocated_bytes_total` | counter | allocation rate — Phase 6 |
| `redis_script_duration_seconds` | histogram | Lua có thành nghẽn chưa |
| `cache_requests_total{tier,result}` | counter | hit rate từng tầng — Phase 4 |
| `kafka_consumer_lag` | gauge | worker có theo kịp — Phase 5 |
| `queue_depth{eventId}` | gauge | độ dài hàng chờ — Phase 5 |

## Histogram, không phải Summary

Micrometer mặc định dùng summary (tính percentile tại client). **Luôn chọn histogram:**

```yaml
management.metrics.distribution.percentiles-histogram.http.server.requests: true
management.metrics.distribution.slo.http.server.requests: 10ms,50ms,100ms,200ms,500ms,1s,5s
```

Lý do: percentile của summary **không cộng được** giữa 4 instance. `avg(p99)` là con số vô
nghĩa. Histogram cho phép `histogram_quantile(0.99, sum(rate(...)) by (le))` — p99 thật của
toàn hệ thống. Đây là lỗi phổ biến nhất khi scale out ở Phase 8.

## 4 Dashboard

| Dashboard | Panel chính | Mở khi nào |
|---|---|---|
| `business.json` | oversell · leaked · soldout rate · queue depth · drift | **đầu tiên**, mọi lần test |
| `red.json` | rate/error/duration per endpoint · p50/95/99 | xem latency |
| `jvm.json` | heap · GC pause · threads · alloc rate · pinned VT | Phase 6 |
| `db-redis.json` | pool active/pending · QPS · query time · cache hit · lua duration | Phase 2, 4 |

File: `observability/grafana/dashboards/`. Provision tự động, **không click tay** — dashboard
click tay không nằm trong git và sẽ mất.

## Tracing

OTel java agent, không instrument thủ công:

```bash
java -javaagent:tools/otel/opentelemetry-javaagent.jar \
     -Dotel.service.name=booking-app \
     -Dotel.traces.exporter=otlp \
     -jar backend/target/app.jar
```

Span quan trọng cần thấy trong Jaeger: `POST /reservations` → `redis.eval` → `kafka.send`.
Nếu span `redis.eval` chiếm 90% thời gian thì bạn biết tối ưu ở đâu.

**Sampling:** dev 100%. Khi chạy `spike.js` (50k VU) hạ xuống 1% — 100% sampling ở tải đó
làm Jaeger thành bottleneck và bạn sẽ đo nhầm overhead của chính công cụ đo.

## Alert

File: `observability/alerts.yml`

```yaml
- alert: Oversell
  expr: increase(inventory_oversell_total[1m]) > 0
  for: 0s                      # không chờ — oversell là lỗi tức thì
  labels: { severity: critical }

- alert: PoolExhausted
  expr: hikaricp_connections_pending > 0
  for: 30s

- alert: ReconciliationDrift
  expr: reconciliation_drift > 0
  for: 60s
```
