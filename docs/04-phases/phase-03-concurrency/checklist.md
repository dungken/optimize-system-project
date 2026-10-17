# Phase 3 — Exit checklist

## Correctness — ưu tiên tuyệt đối

- [ ] `oversell == 0` với **cả 4** strategy, ở 100 / 1k / 10k VU
- [ ] `oversell == 0` khi kill Redis giữa `spike.js`
- [ ] `oversell == 0` khi `kill -STOP` app 10s rồi `-CONT`
- [ ] `oversell == 0` khi `tc netem delay 200ms` trên DB
- [ ] `oversell == 0` khi Redis restart mất hết key
- [ ] `reservation_leaked_total == 0` sau mọi test
- [ ] Gửi trùng `Idempotency-Key` 100 lần → đúng **1** reservation
- [ ] Trả vé 2 lần (listener + job cùng chạy) → `stock` **không** phình
- [ ] `release_duplicate_total > 0` — chứng tỏ chốt `SETNX` đang làm việc
- [ ] `reconciliation_drift` về 0 sau khi Kafka catch up

## Đã hoàn thành

- [ ] 4 strategy implement xong, đổi được bằng config
- [ ] Virtual threads đo riêng, tìm và sửa pinning
- [ ] `scripts/chaos/reset.sh` hoàn tác được **mọi** chaos
- [ ] `stock:` nằm ở Redis DB riêng với `noeviction`
- [ ] Fallback Redis chết → `AtomicUpdateStrategy` hoạt động
- [ ] ADR chọn strategy đã viết

## Bảng so sánh — deliverable chính

`results/phase-03-concurrency/strategy-comparison.md`

| Chiến lược | Throughput | p99 | Retry rate | Deadlock | Pool cần | Oversell | Độ phức tạp |
|---|---|---|---|---|---|---|---|
| Pessimistic | | | — | | | 0 | thấp |
| Optimistic | | | | | | 0 | trung bình |
| Atomic UPDATE | | | — | | | 0 | **thấp** |
| Redis Lua | | | — | | | | 0 | cao |
| Redis Lua + VT | | | — | | | 0 | cao |

Kèm **4 cột định tính**: dễ hiểu / dễ debug / dễ vận hành / số thành phần phải chạy.

Một chiến lược nhanh gấp 4 lần nhưng cần thêm Redis + Kafka + reconciliation job + warm
cache + fallback — đó là đánh đổi phải nói rõ, không phải bỏ qua.

## So dự đoán với thực tế

| # | Dự đoán throughput | Thực tế | Lệch | Tôi đã hiểu sai điều gì |
|---|---|---|---|---|
| 3.1 | ~200 rps | | | |
| 3.2 | ~150 rps | | | |
| 3.3 | ~2.000 rps | | | |
| 3.4 | ~8.000 rps | | | |
| 3.5 | không đổi | | | |

Cột cuối là phần giá trị nhất của cả phase.

## Câu hỏi phải trả lời được

1. Vì sao optimistic lock **tệ hơn** pessimistic ở đây? Retry rate bao nhiêu?
2. Atomic UPDATE nhanh hơn pessimistic bao nhiêu lần? Vì sao, cụ thể?
3. Virtual threads đổi được gì, **không** đổi được gì? Số liệu nào chứng minh?
4. Khi Redis chết, hệ thống mất gì — vé, tốc độ, hay tính đúng đắn?
5. Quy tắc Redis ↔ DB lệch: ai thắng, vì sao?
6. Nếu phải vận hành thật với 1 người on-call, bạn chọn strategy nào? (**gợi ý:** có thể
   không phải cái nhanh nhất)
7. Nghẽn giờ dịch sang đâu?
