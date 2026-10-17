# Load profile

4 script, khác nhau ở **hình dạng tải**, không khác ở logic. Logic nằm trong
`load-test/scenarios/` để so sánh được công bằng.

## 4 script

| Script | Hình dạng | Thời gian | Tìm ra |
|---|---|---|---|
| `smoke.js` | 1 VU | 1 phút | API có lỗi không — **chạy trước mọi thứ** |
| `load.js` | ramp → 500 VU, giữ | 10 phút | throughput bền, p99 ổn định |
| `spike.js` | **0 → 50.000 VU trong 10s** | 2 phút | ★ hành vi flash-sale thật |
| `soak.js` | 200 VU đều | 1 giờ | memory leak, connection leak |

## `spike.js` là bài test thật

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 50000 },   // mở bán — đột ngột
    { duration: '60s', target: 50000 },   // giữ
    { duration: '30s', target: 0 },
  ],
};
```

Flash-sale **không** có ramp-up. 50.000 người bấm F5 vào đúng giây mở bán. Mọi script
có ramp mượt đều đang test một tình huống không tồn tại.

⚠️ Kiểm tra k6 không phải bottleneck: xem CPU của chính process k6. Nếu nó đạt 100% thì
số đo là về k6, không về hệ thống. Chia tải ra nhiều máy, hoặc giảm VU và ngoại suy.

## Tỉ lệ scenario

```
browse.js   80%   GET /events, GET /events/{id}
reserve.js  20%   POST /reservations, POST /orders
```

Phản ánh thực tế: phần lớn người xem rồi thoát. Nếu test 100% reserve thì bạn đang tối ưu
một hệ thống không giống hệ thống thật, và sẽ bỏ qua hẳn phần cache (Phase 4).

## Dữ liệu test phải thực tế

| Yếu tố | Thiết lập | Vì sao |
|---|---|---|
| Phân bố event | **90% traffic vào 1 event** | hot key là thực tế của flash-sale |
| `qty` | phân bố 1-4, lệch về 2 | người mua vé theo cặp |
| `Idempotency-Key` | UUID mới mỗi request | mô phỏng client đúng |
| Retry | 5% request gửi lại cùng key | mô phỏng timeout thật |

Phân bố đều giữa 1.000 event là tình huống **dễ nhất** cho hệ thống — và không bao giờ
xảy ra ở flash-sale.

## Threshold = test tự động

```javascript
export const thresholds = {
  'http_req_duration{endpoint:reserve}': ['p(99)<200'],
  'http_req_failed': ['rate<0.001'],
  'checks': ['rate>0.999'],
};
```

`make bench` fail khi vượt ngưỡng → đo lường trở thành test, không phải việc đọc số bằng mắt.

## Checklist trước mỗi lần đo

- [ ] `scripts/chaos/reset.sh` — không còn `tc` rule
- [ ] `tc qdisc show dev lo` xác nhận sạch
- [ ] `smoke.js` pass (API đúng trước khi đo tải)
- [ ] Invariant test pass
- [ ] Warm up 2 phút (JIT)
- [ ] Ghi lại điều kiện: pool, heap, GC, strategy, data size, shared_buffers
- [ ] Dashboard `business.json` đang mở

## Ghi kết quả

```
results/phase-NN-xxx/
├── k6-spike-<ngày>.json      # thô (gitignored)
├── summary.md                # bảng số + điều kiện đo  ← commit cái này
└── grafana-*.png             # screenshot
```

Số liệu không ghi điều kiện đo là số liệu vô dụng — 2 tuần sau bạn sẽ không biết nó đo
với pool bao nhiêu.
