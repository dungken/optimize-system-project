# Architecture Decision Records

Mỗi quyết định kiến trúc một file. **Viết ngay lúc quyết, không viết hồi tố** — hồi tố là
viết lại lịch sử, và bạn sẽ tự biện minh cho lựa chọn đã làm thay vì ghi lại lý do thật.

## Danh sách

| # | Quyết định | Phase | Trạng thái |
|---|---|---|---|
| [0001](0001-check-constraint-giu-invariant.md) | CHECK constraint giữ invariant ở tầng DB | 1 | ✅ accepted |
| [0002](0002-tach-inventory-khoi-ticket-types.md) | Tách `inventory` khỏi `ticket_types` | 1 | ✅ accepted |
| [0003](0003-redis-la-cache-khong-phai-su-that.md) | Redis là cache, DB luôn thắng khi lệch | 3 | ✅ accepted |
| 0004 | Chọn chiến lược giữ chỗ nào | 3 | ⬜ chờ số liệu |
| 0005 | Pool size và vì sao không lớn hơn | 2 | ⬜ chờ số liệu |
| 0006 | Single-flight hay probabilistic early expiration | 4 | ⬜ chờ số liệu |
| 0007 | Ghi async qua Kafka — đánh đổi | 5 | ⬜ |
| 0008 | SSE hay polling cho hàng chờ | 7 | ⬜ chờ số liệu |

"⬜ chờ số liệu" là đúng quy trình: quyết định phải dựa trên đo, không đoán trước.

## Template

```markdown
# ADR-NNNN: <tên quyết định>

**Trạng thái:** proposed | accepted | superseded by ADR-XXXX
**Ngày:** YYYY-MM-DD
**Phase:** N

## Bối cảnh
Vấn đề gì? Số liệu nào dẫn đến việc phải quyết?

## Các lựa chọn

### A. <tên>
- Ưu:
- Nhược:
- Số đo:

### B. <tên>
...

## Quyết định
Chọn <X> vì <lý do dựa trên số liệu>.

## Hệ quả
**Tích cực:**
**Tiêu cực / cái giá phải trả:**
**Cần theo dõi:** metric nào cho biết quyết định này sai

## Xem lại khi nào
Điều kiện nào khiến quyết định này cần đánh giá lại.
```

Mục **"Cần theo dõi"** là thứ phân biệt ADR thật với tài liệu trang trí: nó nói trước
bạn sẽ biết mình sai bằng cách nào.
