# ADR-0001: CHECK constraint giữ invariant ở tầng DB

**Trạng thái:** accepted
**Ngày:** 2026-10-17
**Phase:** 1

## Bối cảnh

Invariant trung tâm của hệ thống là `reserved + sold <= total`. Phá nó = bán vượt số vé có
= hậu quả kinh doanh thật (phải hoàn tiền, mất uy tín).

Dự án sẽ tối ưu rất hung ở tầng trên: đổi chiến lược lock 5 lần (Phase 3), thêm Redis làm
bộ đếm (Phase 3.4), ghi async qua Kafka (Phase 5), chạy 4 instance (Phase 8). Mỗi thay đổi
đó là một cơ hội phá invariant.

## Các lựa chọn

### A. Chỉ kiểm tra ở tầng application
- Ưu: không chi phí DB, linh hoạt
- Nhược: mỗi chiến lược mới phải tự kiểm lại; race condition ở tầng app không bắt được;
  4 instance thì logic kiểm tra chạy song song không phối hợp
- Số đo: 0 overhead

### B. CHECK constraint ở DB
- Ưu: không bypass được, kể cả khi app sai, Redis sai, hay có race condition;
  là chốt cuối duy nhất thấy toàn bộ trạng thái
- Nhược: một phép so sánh integer mỗi `UPDATE`; lỗi trả về là `SQLException` cần map
- Số đo: overhead không đo được (< nhiễu)

### C. Trigger + bảng audit
- Ưu: ghi lại được mọi lần vi phạm
- Nhược: trigger chạy mỗi UPDATE trên hot row — đúng chỗ không nên thêm gì;
  phức tạp hơn nhiều so với lợi ích
- Số đo: chưa đo, loại vì lý do thiết kế

## Quyết định

Chọn **B**. Thêm `CONSTRAINT no_oversell CHECK (reserved + sold <= total)`.

Lý do quyết định: chi phí gần như bằng 0, còn lợi ích là **cho phép tối ưu hung ở tầng trên
mà không phải đánh cược**. Mỗi lần đổi chiến lược ở Phase 3, nếu tôi làm sai thì DB sẽ
từ chối thay vì bán vượt vé âm thầm.

Đây không phải tối ưu hiệu năng — đây là thứ **cho phép** tối ưu hiệu năng.

## Hệ quả

**Tích cực:**
- 5 chiến lược ở Phase 3 đều có chốt cuối giống nhau → so sánh công bằng
- Redis sai (Phase 3.4) không dẫn đến oversell, chỉ dẫn đến `SQLException` bắt được
- Có chỗ gắn metric `inventory_oversell_total`

**Tiêu cực / cái giá phải trả:**
- Phải map `SQLException` (constraint violation) sang `409 SOLD_OUT` — không được để lọt
  ra thành `500`
- Ở Phase 5 (ghi async), vi phạm constraint xảy ra **ở worker**, sau khi client đã nhận
  `201`. Phải có đường xử lý: huỷ reservation + trả vé + ghi metric
- Che mất lỗi logic: nếu app tính sai mà constraint chặn, bạn thấy exception chứ không
  thấy oversell → dễ tưởng "hệ thống đúng"

**Cần theo dõi:**
- `inventory_oversell_total` — phải luôn 0. Nếu > 0 nghĩa là constraint đã bị bypass
  (migration sai, hoặc ghi trực tiếp vào DB)
- Số `SQLException` constraint violation — nếu tăng, logic tầng trên đang sai

## Xem lại khi nào

Nếu `UPDATE inventory` trở thành bottleneck đo được và constraint chiếm phần đáng kể
(cần đo riêng, dự kiến không xảy ra).
