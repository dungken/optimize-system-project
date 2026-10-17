# Phase 3 — Concurrency & Correctness ★

`2 tuần` · **không bỏ được** — phase giá trị cao nhất của dự án

## Mục tiêu

Thử **5 chiến lược giữ chỗ**, đo từng cái dưới cùng điều kiện, chọn một cái và giải thích
được tại sao — gồm cả đánh đổi độ phức tạp, không chỉ con số.

Và: giữ `oversell == 0` qua **mọi** test, kể cả khi kill component giữa luồng.

## Vì sao đây là phase quan trọng nhất

Cái phân biệt người **biết** các kỹ thuật concurrency với người **biết chọn** kỹ thuật
chính là bảng so sánh bạn tạo ra ở phase này.

Hầu hết người học đọc "optimistic lock nhanh hơn pessimistic" rồi dùng mọi nơi. Ở đây bạn
sẽ **đo được** rằng dưới contention cao, optimistic **tệ hơn** — và hiểu vì sao.

## Thiết kế để so sánh được

Một interface, 5 implementation, đổi bằng config:

```yaml
app.reserve.strategy: atomic-update   # pessimistic | optimistic | atomic-update | redis-lua
```

Sơ đồ: [../../03-diagrams/strategy-tree.md](../../03-diagrams/strategy-tree.md)

**Vì sao thiết kế vậy:** cho phép chạy 5 chiến lược dưới **cùng một lần k6**, cùng data,
cùng máy, cùng giờ. Không có interface này thì Phase 3 thành 5 lần viết lại và số đo
không so sánh được với nhau.

## Dự đoán — viết trước khi đo

| # | Chiến lược | Throughput | p99 | Vì sao |
|---|---|---|---|---|
| 3.1 | Pessimistic | ~200 rps | > 5s | serialize trên 1 row |
| 3.2 | Optimistic | ~150 rps | > 8s | bão retry, **tệ hơn 3.1** |
| 3.3 | Atomic UPDATE | ~2.000 rps | ~50ms | 1 round-trip |
| 3.4 | Redis Lua | ~8.000 rps | ~5ms | không chạm DB |
| 3.5 | + Virtual threads | **không đổi** | — | nghẽn ở pool, không ở thread |

Chỗ lệch nhiều nhất giữa dự đoán và thực tế là chỗ bạn hiểu sai hệ thống. Đó là giá trị thật.

## Phần khó nhất: correctness khi đã nhanh

3.4 nhanh nhất nhưng sinh ra bài toán mới:

```
Redis giảm stock  →  Kafka  →  Worker ghi DB
     ↑                                  ↓
     └──── lệch nhau khi nào? ai thắng? ┘
```

| Vấn đề | Giải pháp |
|---|---|
| Client retry → 2 vé | Idempotency key: Redis + UNIQUE ở DB |
| Redis chết giữa luồng | Fallback về `AtomicUpdateStrategy` |
| Redis và DB lệch | `ReconciliationJob` — **DB luôn thắng** |
| Vé hết hạn không trả về | 2 cơ chế: keyspace notification + job quét |
| Trả vé 2 lần → oversell | Chốt `SETNX released:{resId}` |

Luồng trả vé là nơi bug trốn: [../../03-diagrams/sequence-release.md](../../03-diagrams/sequence-release.md)

## Bài học kỳ vọng

- Isolation level thật sự làm gì — thử `READ COMMITTED` vs `REPEATABLE READ`, xem lỗi nào xuất hiện
- **Lost update** và **write skew** bằng mắt, không qua lý thuyết
- Vì sao optimistic lock tệ dưới contention cao
- Idempotency trong hệ phân tán: tại sao cần **hai** lớp (Redis + DB constraint)
- Virtual thread giải quyết nghẽn *thread*, **không** giải quyết nghẽn *connection pool*
- **Thêm cơ chế cho đáng tin cậy hơn có thể sinh ra đường oversell mới**

## Bẫy

| Bẫy | Hậu quả |
|---|---|
| Chỉ test happy path | Oversell chỉ xuất hiện khi có lỗi giữa luồng |
| Dựa hoàn toàn vào keyspace notification | Redis không đảm bảo giao → vé rò rỉ âm thầm |
| Không có chốt `SETNX` khi trả vé | Trả 2 lần → stock phình → oversell |
| `maxmemory-policy allkeys-lru` | Redis evict `stock:{ttId}` → Lua trả -2 → sập |
| Quên `scripts/chaos/reset.sh` | `tc` rule còn đó, mọi số đo sau đều sai |
