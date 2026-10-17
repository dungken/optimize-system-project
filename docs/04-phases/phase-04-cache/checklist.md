# Phase 4 — Exit checklist

## Phải đạt

- [ ] Hit rate catalog > **95%**
- [ ] DB QPS giảm > **10×** so với Phase 3
- [ ] **Không** stampede khi chủ động `FLUSHDB` dưới tải 500 VU
- [ ] Penetration: 100% ID không tồn tại → DB QPS vẫn thấp
- [ ] Hot key: 90% traffic 1 event → Redis ops phân bố đều, không dồn 1 node
- [ ] Hit rate đo được **riêng từng tầng** (Caffeine và Redis), không chỉ tổng
- [ ] Test chặn regression: `stock:` không bao giờ vào Caffeine
- [ ] `oversell == 0` (cache không được phá invariant)
- [ ] Không có `KEYS` trong code (chỉ `SCAN` khi debug tay)

## Số liệu phải ghi

| Chỉ số | Sau P3 | Sau P4 | Δ |
|---|---|---|---|
| p99 `GET /events` | | | |
| p99 `GET /events/{id}` | | | |
| DB QPS | | | |
| Hit rate Caffeine | — | | |
| Hit rate Redis | — | | |
| Latency Caffeine / Redis / DB | | | |
| DB QPS đỉnh khi stampede (trước sửa) | — | | |
| DB QPS đỉnh khi stampede (sau sửa) | — | | |
| Staleness: TTL-only | — | | |
| Staleness: write-through | — | | |
| Staleness: event-driven | — | | |

## Câu hỏi phải trả lời được

1. Single-flight vs probabilistic early expiration — cái nào tốt hơn ở đây, vì sao?
2. Bloom filter có đáng so với negative cache đơn giản? Số liệu nào chứng minh?
3. Staleness đổi lấy bao nhiêu ms latency? Người dùng chịu được bao nhiêu giây?
4. Vì sao `stock:` không được cache local? Nếu cache thì hỏng thế nào, cụ thể?
5. Nghẽn giờ dịch sang đâu?
