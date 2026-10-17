# Flash-Sale Ticket Booking — Lộ trình học tối ưu hệ thống

> Dự án học tập: bán 1.000 vé cho 50.000 người truy cập đồng thời.
> Mục tiêu thật sự **không phải** xây xong hệ thống, mà là **đo được** từng thay đổi tối ưu.

---

## Nguyên tắc xuyên suốt (đọc lại mỗi phase)

1. **Không tối ưu gì trước khi đo được.** Mọi thay đổi phải có số liệu before/after.
2. **Một thay đổi, một lần.** Đổi 3 thứ cùng lúc thì bạn không biết thứ nào có tác dụng.
3. **Invariant là bất khả xâm phạm.** `oversell == 0` luôn đúng, kể cả khi tối ưu. Nhanh mà sai thì vô nghĩa.
4. **Tải nhỏ không có bài học.** Luôn test với dữ liệu lớn (10M+ rows) và tải cao.
5. **Ghi cả thất bại.** Tối ưu không hiệu quả là entry giá trị nhất trong log.

## SLO mục tiêu (đích đến cuối dự án)

| Chỉ số | Mục tiêu |
|---|---|
| `POST /reservations` p99 | < 200 ms |
| Throughput reserve | > 5.000 req/s |
| Oversell | **0** (tuyệt đối) |
| Error rate (5xx) | < 0.1% |
| GC pause p99 | < 10 ms |
| Frontend LCP (3G throttle) | < 2.5 s |

## Tech stack

```
Backend    Java 21 + Spring Boot 3, PostgreSQL 16, Redis 7, Kafka (phase 5+)
Frontend   React 18 + TypeScript + Vite + TanStack Query
Đo lường   Micrometer -> Prometheus -> Grafana | OpenTelemetry -> Jaeger
Load test  k6 (chính) hoặc Gatling
Profiling  async-profiler, JDK Flight Recorder (JFR)
```

## Domain tối giản (đừng phình ra)

```
Event          (sự kiện)        1 --- N  TicketType
TicketType     (loại vé)        1 --- 1  Inventory (total, reserved, sold)
Reservation    (giữ chỗ 10 phút, có idempotency_key)
Order          (đơn đã xác nhận)
User
```

Luồng: `xem event` → `POST /reservations` (giữ chỗ) → `POST /orders` (xác nhận) → payment mock.

Chỉ `POST /reservations` là hot path. Tối ưu tập trung vào đó.

---

# PHASE 0 — Hạ tầng đo lường

> ⚠️ Làm **TRƯỚC** khi viết dòng business logic nào. Đây là phase quan trọng nhất.

### Việc cần làm
- [ ] `docker-compose.yml`: postgres, redis, prometheus, grafana, jaeger
- [ ] Spring Boot + `spring-boot-starter-actuator` + `micrometer-registry-prometheus`
- [ ] OpenTelemetry Java agent → Jaeger (distributed tracing)
- [ ] Grafana dashboard **RED**: Rate / Errors / Duration theo endpoint
- [ ] Grafana dashboard **JVM**: heap, GC pause, thread count, allocation rate
- [ ] Grafana dashboard **DB**: HikariCP active/idle/pending, query time
- [ ] k6 scripts trong `load-test/`:
  - `smoke.js` — 1 VU, kiểm tra API không lỗi
  - `load.js` — tải đều, tìm throughput bền
  - `spike.js` — **0 → 50.000 VU trong 10s** (đây là bài test thật của flash-sale)
  - `soak.js` — tải vừa trong 1 giờ, tìm memory leak
- [ ] async-profiler chạy được, xuất flame graph HTML
- [ ] Script `make bench` : chạy load test + lưu kết quả JSON vào `results/`

### Tiêu chí hoàn thành
Chạy **một lệnh** → sinh tải → mở Grafana → thấy p50/p95/p99, error rate, DB pool, GC. Không có điều này thì mọi phase sau chỉ là đoán.

### Bài học
Vì sao p99 quan trọng hơn mean. Histogram vs summary trong Prometheus. Tail latency amplification (vì sao 1 service p99=100ms nhưng 10 lần gọi → p99 tổng tệ hơn nhiều).

---

# PHASE 1 — Bản "ngây thơ" + Baseline

> Cố tình viết tệ. Đây là mốc so sánh cho toàn bộ dự án.

### Việc cần làm
- [ ] JPA entities, `JpaRepository`, service `@Transactional`
- [ ] Giữ chỗ bằng `SELECT ... FOR UPDATE` trên row inventory
- [ ] Không cache, không index ngoài PK, trả về full entity trong response
- [ ] Seed dữ liệu lớn: **10M users, 1.000 events, 50M orders lịch sử**
- [ ] REST API: `GET /events`, `GET /events/{id}`, `POST /reservations`, `POST /orders`
- [ ] Chạy `spike.js` → ghi lại baseline vào `results/baseline.md`
- [ ] Chụp flame graph CPU + allocation ở thời điểm tải đỉnh

### Số liệu cần ghi (dự đoán)
```
p99 reserve     : > 10.000 ms
throughput      : ~200 req/s rồi sập
error rate      : > 40% (timeout + deadlock)
DB pool pending : hàng nghìn thread xếp hàng
deadlock count  : > 0
oversell        : có thể > 0 nếu lock sai
```

### Tiêu chí hoàn thành
File `results/baseline.md` có bảng số liệu + flame graph + screenshot Grafana. **Đừng sửa gì cả ở phase này** — cảm giác "biết chỗ nào sai mà không sửa" là phần của bài học.

### Bài học
Đọc flame graph. Phân biệt bottleneck CPU-bound / IO-bound / lock-bound. Nhìn Grafana để biết *nơi* nghẽn trước khi biết *tại sao*.

---

# PHASE 2 — Tầng Database

> Thường là nơi có 80% cải thiện dễ nhất. Làm trước khi nghĩ đến cache.

### Việc cần làm
- [ ] `EXPLAIN (ANALYZE, BUFFERS)` **mọi** query trong hot path — đọc hiểu seq scan vs index scan, rows estimate vs actual
- [ ] Phát hiện N+1: bật `hibernate.generate_statistics` hoặc dùng `datasource-proxy` đếm query/request
- [ ] Sửa N+1: `JOIN FETCH`, `@EntityGraph`, hoặc **DTO projection** (so sánh cả 3, đo cả 3)
- [ ] Index: composite index đúng thứ tự cột, covering index, partial index (`WHERE status = 'ACTIVE'`)
- [ ] Đo chi phí index lên đường ghi (insert chậm bao nhiêu %)
- [ ] Phân trang: đổi `OFFSET` → **cursor-based (keyset pagination)**, đo ở trang 1 vs trang 10.000
- [ ] HikariCP sizing: tính theo Little's Law, rồi **đo thực tế** pool=5/10/20/50/100 → vẽ đồ thị throughput & p99
- [ ] Read replica cho các endpoint đọc, routing bằng `AbstractRoutingDataSource`
- [ ] Giảm payload: trả DTO gọn thay vì entity đầy đủ, đo byte/response

### Tiêu chí hoàn thành
- Số query mỗi request của `GET /events` giảm từ N+1 về hằng số
- Bảng before/after cho từng thay đổi trong `OPTIMIZATION_LOG.md`
- Tìm được pool size tối ưu **bằng số liệu**, không bằng cảm giác

### Bài học
Pool lớn hơn ≠ nhanh hơn (và hiểu tại sao — đây là insight quan trọng nhất phase này). Cardinality ảnh hưởng chọn index. Vì sao `OFFSET 100000` chậm.

---

# PHASE 3 — Concurrency & Correctness

> Phase hay nhất của dự án. Đây là lý do chọn đề tài flash-sale.

### Việc cần làm — thử **tuần tự từng chiến lược, đo từng cái**

**3.1 Pessimistic lock** (`SELECT FOR UPDATE`)
- [ ] Đo lock wait time, deadlock count, p99 theo mức concurrency 100/1k/10k
- [ ] Hiểu vì sao tất cả request serialize trên một row → throughput bị chặn cứng

**3.2 Optimistic lock** (`@Version`)
- [ ] Đo retry rate, so với pessimistic
- [ ] Phát hiện vấn đề: contention cao → retry bão → tệ hơn pessimistic

**3.3 Atomic single-statement UPDATE**
```sql
UPDATE inventory SET reserved = reserved + 1
WHERE ticket_type_id = ? AND reserved + sold < total
```
- [ ] Đo — thường đây là **winner cho tầng DB**. Hiểu tại sao (không round-trip, lock cực ngắn)

**3.4 Redis atomic counter + Lua script**
- [ ] Chuyển bộ đếm tồn sang Redis, Lua script để atomic check-and-decrement
- [ ] **Idempotency key** cho mỗi request (ngăn double-booking khi client retry)
- [ ] Job reconciliation Redis ↔ DB (xử lý lệch)
- [ ] Chaos test: `docker kill redis` giữa lúc tải đỉnh → có oversell không? có mất vé không?

**3.5 Virtual threads (Java 21)**
- [ ] Đo platform threads vs virtual threads trên cùng workload
- [ ] Giải thích bằng số liệu vì sao virtual threads **không** cứu được connection pool đang cạn
- [ ] Tìm chỗ bị pinning (`synchronized` quanh IO) và sửa

### Tiêu chí hoàn thành
- `oversell == 0` dưới **mọi** test, kể cả khi kill component giữa luồng
- Bảng so sánh 5 chiến lược: throughput / p99 / correctness / độ phức tạp
- Nêu rõ chiến lược nào bạn chọn và **tại sao** (gồm cả đánh đổi độ phức tạp)

### Bài học
Isolation level thật sự làm gì (thử `READ COMMITTED` vs `REPEATABLE READ`). Lost update, write skew. Idempotency trong hệ phân tán. Phân biệt "nhanh" và "đúng".

---

# PHASE 4 — Tầng Cache

### Việc cần làm
- [ ] Cache 2 tầng: Caffeine (local, in-process) → Redis (shared) → DB
- [ ] Đo hit rate từng tầng, đo latency từng tầng
- [ ] **Cache stampede**: cho TTL hết hạn đồng loạt dưới tải → xem DB sập. Sửa bằng single-flight lock hoặc probabilistic early expiration. Đo cả hai
- [ ] **Hot key**: 1 event hot chiếm 90% traffic → local cache + TTL jitter
- [ ] **Negative cache** + Bloom filter cho ID không tồn tại (chống cache penetration)
- [ ] Invalidation: so sánh TTL-only vs write-through vs event-driven (pub/sub). Đo độ trễ dữ liệu (staleness) của từng cách
- [ ] Đo DB QPS giảm bao nhiêu lần

### Tiêu chí hoàn thành
Hit rate catalog > 95%, DB QPS giảm > 10x, và **không có** cache stampede khi test chủ động gây ra nó.

### Bài học
Cache là đánh đổi consistency lấy latency — định lượng được cái đánh đổi đó. Vì sao cache sai nguy hiểm hơn không cache.

---

# PHASE 5 — Admission Control & Degradation

> Hệ thống tốt không phải hệ thống không bao giờ quá tải, mà là hệ thống **suy giảm có kiểm soát**.

### Việc cần làm
- [ ] Rate limiting: token bucket (Bucket4j + Redis), theo user và theo IP
- [ ] **Virtual waiting room**: Redis sorted set làm hàng chờ + API trả vị trí thứ N + SSE push cập nhật
- [ ] **Load shedding**: khi p99 nội bộ > ngưỡng → trả 503 **nhanh** thay vì xếp hàng (fail fast)
- [ ] Circuit breaker + bulkhead + timeout (Resilience4j) — đặt timeout ở **mọi** cuộc gọi ra ngoài
- [ ] Kafka: tách xử lý đơn hàng thành async, API chỉ enqueue → đo p99 giảm bao nhiêu
- [ ] Đo consumer lag, xử lý poison message, đảm bảo idempotent consumer

### Tiêu chí hoàn thành
Ở tải 10x khả năng xử lý: hệ thống **không sập**, error rate có kiểm soát, người dùng được vào hàng chờ, và p99 của người đã vào vẫn trong SLO.

### Bài học
Little's Law áp dụng thực tế. Vì sao hàng chờ vô hạn luôn tệ hơn từ chối sớm. Backpressure.

---

# PHASE 6 — JVM & Runtime Tuning

> Làm **sau cùng** ở backend. Đây là phần cho 5-10% cuối, không phải chỗ bắt đầu.

### Việc cần làm
- [ ] GC: so sánh G1 vs ZGC vs Parallel trên cùng workload — đo pause time p99, throughput
- [ ] Heap sizing: quá nhỏ → GC liên tục; quá lớn → pause dài. Tìm điểm tối ưu bằng đo
- [ ] Allocation flame graph → tìm hot allocation. Thường là: entity không cần, boxing, String concat, Stream trong hot loop
- [ ] Đo chi phí JSON serialization (Jackson) — thử DTO phẳng, `@JsonInclude`, hoặc writer thủ công
- [ ] JFR: bật trong production profile, phân tích lock contention + IO wait
- [ ] Kiểm tra virtual thread pinning bằng `-Djdk.tracePinnedThreads=full`
- [ ] (Tuỳ chọn) So sánh thời gian khởi động: JVM vs GraalVM native image

### Tiêu chí hoàn thành
GC pause p99 < 10ms, allocation rate giảm có số liệu, flame graph before/after rõ ràng.

### Bài học
Vì sao micro-optimization thường vô nghĩa (và khi nào thì không). Cách đọc allocation profile.

---

# PHASE 7 — Frontend (React + TypeScript)

### Việc cần làm
- [ ] Lighthouse baseline + Web Vitals thật (`web-vitals` lib → gửi về backend → Grafana)
- [ ] `rollup-plugin-visualizer` phân tích bundle → tìm dependency nặng vô ích (moment, lodash full, icon set đầy đủ)
- [ ] Code splitting theo route + lazy load, đo lại bundle size & LCP
- [ ] React Profiler: tìm component re-render vô ích. Áp `memo`/`useMemo`/`useCallback` — **và đo xem có thật sự nhanh hơn không** (thường là không, đây là bài học)
- [ ] Virtual scrolling cho danh sách vé dài (`@tanstack/react-virtual`)
- [ ] TanStack Query: cache, stale-while-revalidate, **optimistic update** cho nút giữ chỗ
- [ ] Mạng: brotli compression, HTTP/2, giảm payload, so sánh SSE vs polling cho hàng chờ
- [ ] Test với CPU throttle 4x + mạng Slow 3G (DevTools) — không phải trên máy dev mạnh

### Tiêu chí hoàn thành
LCP < 2.5s và INP < 200ms **dưới điều kiện throttle**, bundle initial < 200KB gzip.

### Bài học
Tối ưu frontend chủ yếu là vấn đề *network và render*, không phải thuật toán JS. `useMemo` thường là premature optimization.

---

# PHASE 8 — Scale Out & Resilience

### Việc cần làm
- [ ] Chạy 4 instance backend sau nginx/traefik
- [ ] Kiểm tra stateless hoàn toàn (session, cache local, scheduled job trùng lặp)
- [ ] Tính lại pool size: 4 instance × pool 20 = 80 connection — DB chịu được không?
- [ ] DB: read replica, thử partition bảng orders theo thời gian
- [ ] Scale test 1 → 2 → 4 instance: vẽ đồ thị throughput. **Giải thích phần không tăng tuyến tính** (Amdahl / Universal Scalability Law)
- [ ] Chaos: kill 1 instance / kill Redis / thêm 200ms latency vào DB / lấp đầy disk → quan sát hành vi

### Tiêu chí hoàn thành
Scale 1→4 instance tăng throughput đáng kể, và bạn **giải thích được bằng số liệu** đâu là shared bottleneck chặn phần còn lại.

---

# PHASE 9 — Tổng kết

> Phase này quyết định dự án có giá trị khi đem đi phỏng vấn hay không.

### Việc cần làm
- [ ] `OPTIMIZATION_LOG.md` hoàn chỉnh (format dưới)
- [ ] Bảng tổng Phase 1 baseline → kết quả cuối, kèm % cải thiện
- [ ] Mục **"Những tối ưu KHÔNG hiệu quả"** — ghi rõ đã kỳ vọng gì, kết quả thật là gì, tại sao
- [ ] Grafana snapshot before/after
- [ ] Phần "nếu làm lại tôi sẽ làm khác" — thứ tự ưu tiên nào đúng hơn

### Format mỗi entry trong OPTIMIZATION_LOG.md

```markdown
## [YYYY-MM-DD] Phase N — <Tên thay đổi>

**Giả thuyết**: tôi nghĩ X là bottleneck vì <bằng chứng từ metric/flame graph>
**Thay đổi**: <mô tả + link commit>

**Đo lường**
| Chỉ số | Before | After | Δ |
|---|---|---|---|
| p50 | | | |
| p99 | | | |
| throughput | | | |
| error rate | | | |

**Kết quả**: đúng / sai / một phần
**Bài học**: <điều bạn không biết trước khi đo>
```

---

## Ước lượng thời gian

| Phase | Thời gian | Ghi chú |
|---|---|---|
| 0 | 1 tuần | Đừng vội, đây là nền tảng |
| 1 | 3-4 ngày | Viết nhanh, seed data mới lâu |
| 2 | 1.5 tuần | Nhiều cải thiện nhất |
| 3 | 2 tuần | **Phase giá trị cao nhất** |
| 4 | 1 tuần | |
| 5 | 1.5 tuần | |
| 6 | 1 tuần | |
| 7 | 1 tuần | |
| 8 | 1 tuần | |
| 9 | 3 ngày | |

Tổng ~11-12 tuần nếu làm nghiêm túc. Nếu thiếu thời gian: **giữ Phase 0, 1, 2, 3, 9** và bỏ phần còn lại — vẫn là dự án tốt. Cắt Phase 0 hoặc 9 thì dự án mất hết giá trị học tập.

## Cấu trúc thư mục đề xuất

```
optimize-system-project/
├── ROADMAP.md
├── OPTIMIZATION_LOG.md
├── docker-compose.yml
├── Makefile                  # make up / make bench / make profile
├── backend/
│   ├── src/main/java/...
│   └── src/main/resources/application-{dev,bench}.yml
├── frontend/
├── load-test/
│   ├── smoke.js
│   ├── load.js
│   ├── spike.js
│   └── soak.js
├── observability/
│   ├── prometheus.yml
│   └── grafana/dashboards/
└── results/
    ├── baseline.md
    └── phase-N/            # JSON k6 + flame graph + screenshot
```
