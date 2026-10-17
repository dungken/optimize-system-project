# ADR-0003: Redis là cache, DB luôn thắng khi lệch

**Trạng thái:** accepted
**Ngày:** 2026-10-17
**Phase:** 3

## Bối cảnh

Ở Phase 3.4, `stock:{ttId}` trong Redis trở thành nơi quyết định "còn vé hay không" trên
hot path. DB được ghi sau, qua Kafka. Hai nơi sẽ lệch nhau — câu hỏi là **ai thắng**.

Không trả lời câu này trước khi code thì mỗi lần lệch sẽ xử lý ad-hoc, và hệ thống sẽ
có hành vi không xác định.

## Các lựa chọn

### A. Redis là source of truth, DB chỉ là bản sao
- Ưu: hot path không cần DB; nhanh nhất
- Nhược: Redis restart = mất trạng thái bán vé thật; không có chốt cuối cho invariant;
  không trả lời được "đã bán bao nhiêu vé" sau sự cố
- Loại: xung đột với [ADR-0001](0001-check-constraint-giu-invariant.md)

### B. DB là source of truth, Redis là cache có quyền quyết định tạm thời
- Ưu: giữ được chốt cuối; sau sự cố luôn khôi phục được từ DB; invariant an toàn
- Nhược: cần reconciliation job; cần quy tắc rõ ràng cho từng kiểu lệch; phức tạp hơn

### C. Ghi đồng bộ cả hai (2PC hoặc transaction bao cả Redis và DB)
- Ưu: không bao giờ lệch
- Nhược: Redis không có transaction phân tán thật với DB; mất hết lợi thế tốc độ;
  một bên chết là cả hai dừng
- Loại vì mục tiêu dự án là tối ưu latency

## Quyết định

Chọn **B**. **DB luôn thắng.** Redis giữ bộ đếm để quyết định nhanh, nhưng khi lệch thì
`ReconciliationJob` hạ Redis về đúng giá trị DB.

### Quy tắc xử lý từng kiểu lệch

```
redis_stock  = GET stock:{ttId}
db_available = total - reserved - sold   (PG primary)
drift        = redis_stock - db_available
```

| Tình huống | Nghĩa | Xử lý |
|---|---|---|
| `drift == 0` | khớp | ghi metric, không làm gì |
| `drift < 0` | Redis bán nhiều hơn DB đã ghi | **bình thường** — Kafka đang trễ. Chỉ báo khi kéo dài > 5 phút |
| `drift > 0` | Redis có nhiều vé hơn thực tế | **NGUY HIỂM** — nguồn oversell. Báo động + hạ `stock` về `db_available` ngay |

Phân biệt `drift < 0` và `drift > 0` là điểm quan trọng: một cái là độ trễ bình thường,
một cái là lỗi. Xử lý giống nhau thì hoặc báo động giả liên tục, hoặc bỏ sót lỗi thật.

## Hệ quả

**Tích cực:**
- Sau mọi sự cố Redis, khôi phục được bằng warm từ DB
- `drift > 0` thành tín hiệu sớm cho oversell, bắt được trước khi khách hàng thấy
- Hot path vẫn nhanh (không chạm DB)

**Tiêu cực / cái giá phải trả:**
- Phải viết và vận hành `ReconciliationJob`
- Client nhận `201` trước khi DB ghi → có cửa sổ thời gian mà "vé đã bán" chưa tồn tại
  trong DB. Nếu Kafka mất message, vé đó biến mất và khách hàng đã được xác nhận
- Phase 5 phải đảm bảo Kafka producer `acks=all` và consumer idempotent

**Cần theo dõi:**
- `reconciliation_drift` — `> 0` kéo dài 60s là báo động
- `kafka_consumer_lag` — lag cao làm `drift < 0` kéo dài, khó phân biệt với lỗi thật
- Nếu phải tăng ngưỡng báo động nhiều lần → thiết kế async đang quá mong manh

## Xem lại khi nào

Nếu `drift > 0` xảy ra nhiều hơn 1 lần/tuần ở môi trường ổn định → cơ chế hiện tại không
đủ, cần xem lại cách Redis và DB đồng bộ (ví dụ: ghi DB đồng bộ cho phần cuối của lô vé).
