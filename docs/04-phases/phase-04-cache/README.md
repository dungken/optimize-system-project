# Phase 4 — Tầng Cache

`1 tuần` · bỏ được (nhưng mất một nhóm bài học riêng)

## Mục tiêu

Giảm DB QPS > 10× cho đường đọc, và **chủ động gây ra** 3 vấn đề cache rồi sửa chúng.

## Vì sao sau Phase 3

Cache **che mất** lock contention. Thêm cache trước Phase 3 thì p99 giảm và bạn kết luận
sai nguyên nhân — không học được gì về concurrency.

## Phạm vi

2 tầng: Caffeine (in-process) → Redis (shared) → Postgres.
Sơ đồ: [../../03-diagrams/cache-tiers.md](../../03-diagrams/cache-tiers.md)

Ba vấn đề phải **tự gây ra** rồi sửa:

| Vấn đề | Cách gây ra để test | Cách sửa |
|---|---|---|
| **Stampede** | `FLUSHDB` giữa lúc `load.js` 500 VU | single-flight lock / probabilistic early expiration |
| **Penetration** | k6 bắn 100% ID không tồn tại | negative cache + bloom filter |
| **Hot key** | 90% traffic vào 1 event | Caffeine local + TTL jitter |

Không gây ra được thì chưa test đúng — "không thấy vấn đề" khác "đã chứng minh không có vấn đề".

## Bài học kỳ vọng

- Cache là đánh đổi **consistency lấy latency** — và bạn sẽ **định lượng** được cái đánh đổi
  đó (staleness bao nhiêu giây, đổi lấy bao nhiêu ms).
- Cache sai **nguy hiểm hơn** không cache: không cache thì chậm, cache sai thì sai.
- TTL jitter là một dòng code loại bỏ hẳn một lớp vấn đề.
- Vì sao `stock:` **không bao giờ** được cache ở Caffeine (4 instance = 4 bản khác nhau).

## Bẫy

| Bẫy | Hậu quả |
|---|---|
| Cache `stock` ở Caffeine | 4 instance thấy 4 số khác nhau → oversell |
| TTL đều nhau không jitter | stampede lặp lại mỗi 60s |
| Chỉ đo hit rate tổng | không biết tầng nào đang làm việc |
| Invalidation bằng `KEYS pattern` | O(n) chặn Redis single-thread → cả hệ thống đứng |
