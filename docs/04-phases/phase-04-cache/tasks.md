# Phase 4 — Task breakdown

| ID | Task | Est | Output |
|---|---|---|---|
| P4-T01 | `CacheConfig` — Caffeine + RedisTemplate, 2 tầng | 4h | |
| P4-T02 | `EventCache` — get-or-load qua 2 tầng, TTL 60s | 4h | |
| P4-T03 | Metric `cache_requests_total{tier,result}` — hit rate **từng tầng** | 3h | ★ |
| P4-T04 | Đo latency từng tầng (Caffeine / Redis / DB) | 2h | ~100ns / ~0,5ms / ~5ms |
| P4-T05 | **Gây stampede**: `FLUSHDB` giữa `load.js` 500 VU, chụp đỉnh DB QPS | 3h | ★ bằng chứng vấn đề tồn tại |
| P4-T06 | Sửa bằng single-flight lock, đo lại | 4h | |
| P4-T07 | Sửa bằng probabilistic early expiration, đo lại | 4h | |
| P4-T08 | So sánh T06 vs T07 → chọn + lý do | 2h | |
| P4-T09 | TTL jitter (`60s + random(0,15s)`), đo DB QPS phân bố theo thời gian | 2h | ★ 1 dòng, hiệu quả lớn |
| P4-T10 | **Gây penetration**: k6 bắn ID không tồn tại 100% | 2h | |
| P4-T11 | Negative cache (TTL ngắn 5s), đo | 3h | |
| P4-T12 | Bloom filter cho `ticket_type_id`, đo so với negative cache | 4h | |
| P4-T13 | **Gây hot key**: 90% traffic vào 1 event, đo phân bố ops Redis | 3h | |
| P4-T14 | Xác nhận Caffeine giải quyết hot key, đo | 2h | |
| P4-T15 | Invalidation: so sánh TTL-only / write-through / event-driven (pub-sub) | 5h | |
| P4-T16 | Đo **staleness** từng cách invalidation (cache cũ hơn DB bao lâu) | 3h | ★ định lượng đánh đổi |
| P4-T17 | Kiểm: `stock:` KHÔNG nằm trong Caffeine (viết test chặn regression) | 2h | ★ chống oversell |
| P4-T18 | Viết `results/phase-04-cache/cache-report.md` | 3h | |

**Tổng ~55h ≈ 1 tuần**
