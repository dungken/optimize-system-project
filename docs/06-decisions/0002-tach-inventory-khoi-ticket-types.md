# ADR-0002: Tách `inventory` khỏi `ticket_types`

**Trạng thái:** accepted
**Ngày:** 2026-10-17
**Phase:** 1

## Bối cảnh

`ticket_types` chứa `name`, `price_cents` — đọc rất nhiều, gần như không bao giờ đổi.
Số vé còn lại (`total`, `reserved`, `sold`) — ghi rất nhiều, mỗi lần giữ chỗ là một `UPDATE`.

Ở flash-sale, cùng một `ticket_type_id` nhận 50.000 lượt đọc **và** 1.000 lượt ghi
trong 10 giây.

## Các lựa chọn

### A. Một bảng `ticket_types` chứa cả counter
- Ưu: đơn giản, 1 join ít hơn, chuẩn hoá tự nhiên
- Nhược: mỗi `UPDATE reserved` tạo row version mới (Postgres MVCC) → mọi request đang đọc
  `price` phải đi qua version chain; row bị invalidate khỏi shared_buffers liên tục;
  đường đọc và đường ghi tranh nhau cùng một trang dữ liệu
- Số đo: chưa đo ở Phase 1, dự kiến đo ở Phase 2 nếu cần bằng chứng

### B. Tách `inventory` thành bảng riêng, 1-1
- Ưu: đường đọc (`ticket_types`) và đường ghi (`inventory`) không đụng nhau;
  `ticket_types` gần như read-only → cache rất hiệu quả (Phase 4);
  hot row cô lập trong một bảng nhỏ, vừa trong cache
- Nhược: thêm 1 join khi cần cả hai; quan hệ 1-1 nhìn qua như thiết kế thừa
- Số đo: sẽ đo ở Phase 2

### C. Counter hoàn toàn ở Redis, DB không giữ
- Ưu: nhanh nhất
- Nhược: mất source of truth; Redis restart = mất trạng thái bán vé; không có chốt cuối
  cho invariant
- Loại vì xung đột với [ADR-0001](0001-check-constraint-giu-invariant.md)

## Quyết định

Chọn **B**. `inventory` là bảng riêng, PK = `ticket_type_id`, quan hệ 1-1.

Lý do: tách theo **mẫu truy cập** (access pattern), không theo mô hình dữ liệu. Hai cột
dữ liệu thuộc cùng một thực thể về mặt khái niệm, nhưng có hành vi đọc/ghi trái ngược nhau —
đó là tiêu chí tách bảng quan trọng hơn chuẩn hoá.

## Hệ quả

**Tích cực:**
- Phase 4 cache `ticket_types` với TTL dài được, vì nó không đổi
- Hot row nằm trong bảng ~4.000 dòng, luôn trong cache
- Phase 3 lock chỉ chạm `inventory`, không chặn ai đọc giá

**Tiêu cực / cái giá phải trả:**
- `GET /events/{id}` cần join → nhưng chính nó làm lộ N+1 ở Phase 1, là bài học mong muốn
- Dễ nhầm: cache `inventory` cùng `ticket_types` → cache tồn vé cũ. **Không được cache
  `inventory` ở Caffeine** (xem checklist Phase 4)
- Thêm một bảng phải giữ đồng bộ khi tạo `ticket_type` mới

**Cần theo dõi:**
- Nếu Phase 4 có test regression "`stock` không vào Caffeine" fail → thiết kế đang bị dùng sai

## Xem lại khi nào

Nếu đo ở Phase 2 cho thấy join thêm đắt hơn lợi ích tách bảng (dự kiến không — join trên
PK của bảng 4.000 dòng gần như miễn phí).
