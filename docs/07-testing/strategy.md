# Chiến lược test

Dự án hiệu năng có kim tự tháp test khác dự án thường: **test tính đúng đắn dưới tải**
quan trọng hơn unit test.

```
         ▲  ít, chậm, giá trị cao
         │
    ┌────┴─────┐
    │  Chaos   │  oversell=0 khi có sự cố        ← Phase 3, 8
    ├──────────┤
    │   Load   │  k6: smoke/load/spike/soak      ← mọi phase
    ├──────────┤
    │Invariant │  1.000 thread, assert oversell  ← ★ xương sống
    ├──────────┤
    │Integration│ API + DB + Redis thật
    ├──────────┤
    │   Unit   │  logic thuần (state machine)
    └──────────┘
         │
         ▼  nhiều, nhanh, giá trị thấp hơn ở dự án này
```

## Vì sao invariant test là xương sống

Unit test không bắt được oversell — oversell chỉ xuất hiện khi có concurrency thật.
`OversellConcurrencyTest` (1.000 thread cùng giữ chỗ) là test duy nhất chứng minh được
một chiến lược là **đúng**, không chỉ **nhanh**.

Và nó phải chạy được với **cả 5 chiến lược** của Phase 3 — nếu không, bạn chỉ biết cái
nào nhanh, không biết cái nào đúng.

## Danh sách test

| Test | Loại | Phase | Chứng minh |
|---|---|---|---|
| `ReservationStateTest` | unit | 1 | chuyển trạng thái hợp lệ/không hợp lệ |
| `OversellConcurrencyTest` | invariant | 3 | ★ `oversell == 0` với 1.000 thread |
| `IdempotencyTest` | invariant | 3 | gửi trùng 100 lần → 1 reservation |
| `ExpiryReleaseTest` | invariant | 3 | hết hạn trả đúng số vé |
| `DoubleReleaseTest` | invariant | 3 | ★ trả 2 lần không làm phình `stock` |
| `StrategyBenchmarkTest` | benchmark | 3 | so sánh 5 chiến lược |
| `StampedeTest` | integration | 4 | cache stampede được chặn |
| `StockNotInCaffeineTest` | regression | 4 | ★ `stock` không vào cache local |
| `BulkheadTest` | integration | 5 | payment chậm không làm chết API khác |
| `KafkaIdempotentConsumerTest` | integration | 5 | gửi lại message không tạo vé thứ 2 |

## Nguyên tắc

1. **Mỗi invariant có một test.** Invariant không có test = invariant không tồn tại.
2. **Test phải chạy được với mọi strategy.** Dùng `@ParameterizedTest` qua danh sách
   `ReserveStrategy`.
3. **Không mock DB và Redis trong invariant test.** Race condition chỉ xuất hiện với
   DB thật. Dùng PG và Redis local (đã có sẵn), schema riêng cho test.
4. **Regression test cho mọi bug tìm được.** Phase 3 sẽ tìm ra bug — mỗi bug thành một test.
5. **Load test là test, không phải demo.** `k6` có `thresholds` → CI fail nếu p99 vượt ngưỡng.

## Ngưỡng trong k6

```javascript
// load-test/lib/config.js
export const thresholds = {
  'http_req_duration{endpoint:reserve}': ['p(99)<200'],
  'http_req_failed': ['rate<0.001'],
  'checks': ['rate>0.999'],
};
```

Có `thresholds` thì `make bench` trở thành test tự động, không phải việc đọc số bằng mắt.
