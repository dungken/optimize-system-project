# Tech stack

Chạy **native, không Docker**. Lý do ở [runbook/setup-native.md](../05-runbook/setup-native.md).

## Thành phần

| Lớp | Công nghệ | Phiên bản | Trạng thái trên máy dev |
|---|---|---|---|
| Ngôn ngữ BE | Java | 21 (virtual threads) | ✅ 21.0.12 |
| Framework BE | Spring Boot | 3.x | — |
| Build | Maven | 3.8+ | ✅ 3.8.7 |
| DB | PostgreSQL | 16 | ✅ 16.15, :5432 đang chạy |
| Cache / counter | Redis | 7 | ✅ 7.0.15, :6379 đang chạy |
| Message | Kafka (KRaft) | 3.x | ⬜ Phase 5 |
| Migration | Flyway | — | — |
| FE | React + TypeScript + Vite | 18 / 5 | ⬜ |
| FE data | TanStack Query | 5 | ⬜ |
| Node | Node.js | **cần ≥ 20** | ⚠️ đang 18.19 → `nvm install 22` |
| Metrics | Micrometer → Prometheus | — | ⬜ |
| Dashboard | Grafana | — | ⬜ |
| Trace | OpenTelemetry → Jaeger | — | ⬜ |
| Load test | k6 | — | ⬜ |
| Profiler | async-profiler + JFR | — | ⬜ |
| LB | nginx | — | ⬜ Phase 8 |

## Vì sao chọn từng thứ

**Java 21** — virtual threads là thứ cần đo trong Phase 3.5. Và bài học "virtual thread không
cứu được connection pool" chỉ học được khi có nó.

**PostgreSQL thay vì MySQL** — `EXPLAIN (ANALYZE, BUFFERS)` của Postgres cho thông tin sâu hơn,
và CHECK constraint + partial index là hai công cụ dùng trực tiếp trong thiết kế.

**Redis thay vì Hazelcast/Memcached** — Lua script cho atomic multi-step là thứ bắt buộc
cho thuật toán giữ chỗ. Memcached không có.

**k6 thay vì JMeter** — script là JavaScript, versioned trong git, chạy headless, xuất JSON
để so sánh giữa các phase. JMeter XML không diff được.

**async-profiler thay vì VisualVM** — lấy được allocation profile và không bị safepoint bias.
