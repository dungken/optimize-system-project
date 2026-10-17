# Phase 0 — Exit checklist

## Phải đạt

- [ ] `make stack-up` bật Prometheus + Grafana + Jaeger, `make stack-down` tắt sạch
- [ ] `make bench` chạy k6 và lưu JSON vào `results/`
- [ ] Mở Grafana → thấy **4 dashboard** đã provision tự động (không click tay)
- [ ] Prometheus `/targets` hiện app **UP**
- [ ] `/actuator/prometheus` có metric dạng `_bucket` (histogram, **không** phải summary)
- [ ] 4 metric correctness tồn tại: `inventory_oversell_total`, `reservation_leaked_total`,
      `reconciliation_drift`, `release_duplicate_total`
- [ ] Jaeger UI hiện trace của một request thật
- [ ] `scripts/profile.sh <pid>` xuất ra flame graph HTML mở được
- [ ] `alerts.yml` nạp được, `Oversell` alert hiện trong Prometheus UI
- [ ] `spike.js` chạy được 50.000 VU mà **k6 không phải là bottleneck** (kiểm CPU của k6)

## Bài kiểm tra cuối phase

Chạy đúng 3 lệnh, không sửa gì thêm:

```bash
make stack-up
make bench
# mở http://localhost:3000
```

Trả lời được **cả 5** câu từ Grafana:
1. p99 của `POST /reservations` là bao nhiêu?
2. Error rate bao nhiêu %, chủ yếu loại lỗi nào?
3. Pool có pending không? Bao nhiêu?
4. GC pause p99 bao nhiêu?
5. `inventory_oversell_total` = ?

Không trả lời được câu nào → phase chưa xong. Đừng sang Phase 1.

## Số liệu phải ghi

Chưa có số liệu hiệu năng ở phase này (chưa có business logic). Nhưng ghi lại:

| Hạng mục | Giá trị |
|---|---|
| Overhead của tầng đo lường (p99 có/không OTel agent) | |
| Scrape interval chọn | |
| Sampling rate: dev / bench | |
| k6 chịu được tối đa bao nhiêu VU trên máy này | |
