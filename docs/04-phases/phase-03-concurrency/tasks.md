# Phase 3 — Task breakdown

## Nhóm A — Khung so sánh (làm trước, bắt buộc)

| ID | Task | Est | Output |
|---|---|---|---|
| P3-T01 | `interface ReserveStrategy` + chọn qua `application.yml` | 3h | đổi strategy không sửa code |
| P3-T02 | Metric `reserve_strategy_duration{strategy}` — tag để A/B trên 1 dashboard | 2h | |
| P3-T03 | `OversellConcurrencyTest` — 1.000 thread cùng giữ chỗ, assert `oversell = 0` | 4h | ★ test chạy được với mọi strategy |
| P3-T04 | `IdempotencyTest` — gửi trùng 100 lần → đúng 1 reservation | 3h | |
| P3-T05 | `scripts/chaos/` — kill-redis, slow-db, freeze-app, **reset** | 4h | ★ reset.sh quan trọng nhất |

## Nhóm B — 4 chiến lược, đo từng cái

| ID | Task | Est | Output |
|---|---|---|---|
| P3-T06 | `PessimisticLockStrategy` + đo ở 100/1k/10k VU | 4h | lock wait, deadlock count |
| P3-T07 | `OptimisticLockStrategy` (`@Version` + retry) + đo **retry rate** | 5h | ★ chứng minh tệ hơn T06 |
| P3-T08 | `AtomicUpdateStrategy` (1 câu `UPDATE ... WHERE`) + đo | 4h | |
| P3-T09 | Thử `READ COMMITTED` vs `REPEATABLE READ` trên T06, ghi lỗi khác nhau | 3h | bài học isolation |

## Nhóm C — Redis Lua (phần phức tạp nhất)

| ID | Task | Est | Output |
|---|---|---|---|
| P3-T10 | `reserve.lua` + mã trả về 0/1/-1/-2 map sang HTTP | 4h | |
| P3-T11 | `RedisLuaStrategy` + warm cache trước `sale_starts_at` | 4h | |
| P3-T12 | Idempotency 2 lớp: `idem:{key}` + `UNIQUE` ở DB | 3h | |
| P3-T13 | `release.lua` + chốt `SETNX released:{resId}` | 3h | ★ chống trả vé 2 lần |
| P3-T14 | `HeldExpiryListener` — Redis keyspace notification | 4h | cơ chế tức thì |
| P3-T15 | `ReleaseJob` quét DB mỗi 30s — lưới an toàn | 3h | ★ vì notification có thể mất |
| P3-T16 | `ExpiryReleaseTest` — hết hạn trả đúng số vé, không trả 2 lần | 4h | |
| P3-T17 | `ReconciliationJob` + metric `reconciliation_drift` + quy tắc DB thắng | 5h | ★ |
| P3-T18 | Fallback: Redis chết → tự chuyển `AtomicUpdateStrategy` | 4h | |
| P3-T19 | Đặt `stock:` vào Redis DB riêng, policy `noeviction` | 2h | chống LRU evict stock |

## Nhóm D — Virtual threads

| ID | Task | Est | Output |
|---|---|---|---|
| P3-T20 | Bật virtual threads, đo lại T08 và T11 | 3h | |
| P3-T21 | Tìm pinning: `-Djdk.tracePinnedThreads=full`, sửa `synchronized` quanh IO | 4h | |
| P3-T22 | Giải thích **bằng số liệu** vì sao VT không cứu pool cạn | 3h | ★ bài học chính |

## Nhóm E — Chaos & kết luận

| ID | Task | Est | Output |
|---|---|---|---|
| P3-T23 | Chaos: kill Redis giữa `spike.js` → kiểm oversell + vé rò rỉ | 4h | |
| P3-T24 | Chaos: `kill -STOP` app 10s rồi `-CONT` | 2h | |
| P3-T25 | Chaos: `tc netem delay 200ms` lên DB | 2h | |
| P3-T26 | Chaos: Redis restart mất hết key → warm lại đúng chưa | 3h | |
| P3-T27 | `strategy-comparison.md` — bảng 5 chiến lược + biểu đồ + **kết luận chọn cái nào và vì sao** | 5h | ★★ **deliverable chính** |
| P3-T28 | ADR: chọn chiến lược, gồm đánh đổi độ phức tạp | 2h | |

**Tổng ~96h ≈ 2 tuần**

## Thứ tự

```
A (T01-T05)   ← khung + test + chaos tool. KHÔNG bỏ qua.
B (T06-T09)   ← 4 chiến lược ở tầng DB, dễ đến khó
C (T10-T19)   ← Redis Lua, phần dài nhất
D (T20-T22)   ← virtual threads
E (T23-T28)   ← chaos rồi kết luận
```

⚠️ Nhóm A trước tiên. `OversellConcurrencyTest` (T03) phải chạy được với **mọi** strategy —
không có nó thì bạn không biết strategy nào đúng, chỉ biết cái nào nhanh.
