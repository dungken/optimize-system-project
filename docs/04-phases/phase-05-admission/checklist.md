# Phase 5 — Exit checklist

## Phải đạt

- [ ] Tải **10× công suất** (50.000 rps vào, ~5.000 xử lý): **không sập**
- [ ] Request được nhận vẫn trong SLO (p99 < 200ms)
- [ ] Mọi 429/503 có `Retry-After`
- [ ] `mock_slow` 2s × 1.000 request → `GET /events` **vẫn sống** (bulkhead hoạt động)
- [ ] Circuit breaker mở khi payment lỗi > 50%, tự đóng lại sau khi hồi phục
- [ ] Timeout đặt ở **mọi** call ra ngoài, không có cái nào vô hạn
- [ ] Hàng chờ: 50k VU → ai cũng có vị trí + ETA, không ai bị treo
- [ ] Tốc độ nhả người lấy từ Prometheus, **không hardcode**
- [ ] Kafka consumer idempotent — gửi lại message không tạo reservation thứ 2
- [ ] Poison message vào DLQ, không block partition
- [ ] Kafka chết → API tự chuyển ghi đồng bộ (p99 tăng, nhưng sống)
- [ ] `oversell == 0` qua tất cả test trên

## Số liệu phải ghi

| Chỉ số | Sau P4 | Sau P5 | Δ |
|---|---|---|---|
| p99 `POST /reservations` | | | |
| p99 sau khi ghi async qua Kafka | | | |
| Throughput xử lý được | | | |
| Ở tải 10×: % 201 / 429 / 503 / 202 | — | | |
| Ở tải 10×: p99 của request được nhận | — | | |
| Consumer lag ở đỉnh | — | | |
| Queue depth đỉnh | — | | |
| Thời gian circuit breaker phát hiện lỗi | — | | |

## Câu hỏi phải trả lời được

1. Ngưỡng load shed đặt bao nhiêu, dựa trên số liệu nào?
2. Khi quá tải, bạn ưu tiên từ chối ai? Vì sao công bằng?
3. Ghi async qua Kafka giảm p99 bao nhiêu? Cái giá là gì (đo được)?
4. Nếu Kafka chết 5 phút, hệ thống mất gì?
5. SSE giữ 50.000 connection — virtual threads cần thiết ở đây thế nào? (so với Phase 3.5
   nơi nó không giúp được gì)
6. Nghẽn giờ dịch sang đâu?
