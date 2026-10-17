# Phase 0 — Task breakdown

| ID | Task | Est | Phụ thuộc | Output |
|---|---|---|---|---|
| P0-T01 | `scripts/install-tools.sh` — tải binary vào `tools/`, in URL + dung lượng trước khi tải | 3h | — | `tools/` đầy đủ |
| P0-T02 | `scripts/stack.sh {up\|down\|status}` — bật/tắt Prometheus + Grafana + Jaeger | 3h | T01 | 1 lệnh bật cả stack |
| P0-T03 | Spring Boot skeleton + `pom.xml` (web, actuator, micrometer-prometheus) | 2h | — | `/actuator/health` trả 200 |
| P0-T04 | Cấu hình histogram + SLO buckets trong `application.yml` | 2h | T03 | `/actuator/prometheus` có `_bucket` |
| P0-T05 | `observability/prometheus.yml` — scrape 4 port app (8080-8083) | 1h | T02,T03 | Prometheus thấy target UP |
| P0-T06 | OTel java agent → Jaeger, sampling theo profile | 3h | T01,T03 | thấy trace trong Jaeger UI |
| P0-T07 | `BookingMetrics.java` — counter oversell, leaked, attempts, drift | 3h | T03 | metric xuất hiện ở `/actuator/prometheus` |
| P0-T08 | Grafana provisioning (datasource + dashboard auto-load) | 2h | T02 | restart Grafana không mất dashboard |
| P0-T09 | Dashboard `business.json` — oversell · leaked · soldout · drift | 4h | T07,T08 | mở là thấy ngay "đúng/sai" |
| P0-T10 | Dashboard `red.json` — rate/error/duration per endpoint, p50/95/99 | 4h | T08 | |
| P0-T11 | Dashboard `jvm.json` — heap · GC pause · threads · alloc rate | 3h | T08 | |
| P0-T12 | Dashboard `db-redis.json` — pool · QPS · cache hit · lua duration | 3h | T08 | |
| P0-T13 | `observability/alerts.yml` — oversell, pool exhausted, drift | 2h | T05,T07 | alert hiện trong Prometheus UI |
| P0-T14 | `load-test/lib/{config,helpers}.js` — BASE_URL, threshold, sinh UUID | 2h | — | |
| P0-T15 | `load-test/scenarios/{browse,reserve}.js` — tách logic khỏi hình dạng tải | 3h | T14 | |
| P0-T16 | `smoke.js` — 1 VU, 1 phút | 1h | T15 | |
| P0-T17 | `load.js` — ramp 500 VU, giữ 10 phút | 2h | T15 | |
| P0-T18 | `spike.js` — **0 → 50.000 VU trong 10s** | 3h | T15 | bài test thật của flash-sale |
| P0-T19 | `soak.js` — 200 VU, 1 giờ | 1h | T15 | tìm memory/connection leak |
| P0-T20 | `scripts/bench.sh` + `make bench` — chạy k6, lưu JSON vào `results/` | 3h | T16-T19 | |
| P0-T21 | `scripts/profile.sh` — async-profiler attach theo PID, xuất flame graph HTML | 3h | T01,T03 | file HTML mở được |
| P0-T22 | `Makefile` — stack-up, stack-down, run, bench, profile, seed | 2h | tất cả | entrypoint duy nhất |

**Tổng ~55h ≈ 1 tuần** (7-8h/ngày)

## Thứ tự đề xuất

```
T01 → T02 → T03 → T04 → T05 → T07 → T08 → T09 (business dashboard trước!)
    → T14 → T15 → T16 → T20 → T22      (bench chạy được end-to-end)
    → T10,T11,T12,T13                  (3 dashboard còn lại)
    → T06, T21                         (trace + profiler)
    → T17,T18,T19                      (3 script tải còn lại)
```

Dựng `business.json` + `smoke.js` + `make bench` trước để có vòng lặp đo hoạt động sớm nhất.
Những cái còn lại bồi thêm.
