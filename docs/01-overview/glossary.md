# Thuật ngữ

Những từ dùng xuyên suốt tài liệu. Hiểu sai một từ ở đây là hiểu sai cả một phase.

## Tính đúng đắn

| Thuật ngữ | Nghĩa trong dự án này |
|---|---|
| **Oversell** | Bán vượt số vé có. `reserved + sold > total`. Lỗi nghiêm trọng nhất. |
| **Leaked ticket** | Vé bị khoá vĩnh viễn: giữ chỗ hết hạn nhưng không trả về kho. Mất doanh thu âm thầm. |
| **Invariant** | Điều kiện luôn đúng bất kể tải. Ở đây: `reserved + sold <= total`. |
| **Idempotency** | Gửi cùng một request N lần cho ra cùng một kết quả, không tạo N bản ghi. |
| **Lost update** | Hai transaction đọc cùng giá trị, cùng ghi, một cái mất. |
| **Reconciliation** | Đối chiếu Redis ↔ DB khi lệch, và quy tắc ai thắng. |

## Hiệu năng

| Thuật ngữ | Nghĩa |
|---|---|
| **p99** | 99% request nhanh hơn con số này. Quan trọng hơn mean vì mean che mất đuôi. |
| **Tail latency amplification** | Một request gọi 10 service p99=100ms → p99 tổng tệ hơn 100ms rất nhiều. |
| **Throughput** | req/s hệ thống xử lý xong. Khác với req/s *nhận vào*. |
| **Little's Law** | `L = λ × W`. Số việc đang chạy = tốc độ đến × thời gian xử lý. Dùng để tính pool size. |
| **Amdahl / USL** | Vì sao thêm instance không làm throughput tăng tuyến tính. |
| **Write amplification** | 1 lần ghi logic → nhiều lần ghi vật lý (index, WAL, page split). |

## Cache

| Thuật ngữ | Nghĩa |
|---|---|
| **Stampede** | TTL hết đồng loạt → hàng nghìn request cùng đập vào DB. |
| **Penetration** | Query ID không tồn tại → cache không bao giờ hit → DB nhận hết. |
| **Hot key** | Một key chiếm phần lớn lưu lượng, làm lệch tải một shard/node. |
| **Staleness** | Độ trễ dữ liệu: cache cũ hơn DB bao lâu. Là cái giá của cache. |
| **Single-flight** | Nhiều request cùng cache-miss → chỉ 1 cái đi xuống DB, còn lại chờ. |

## Điều tiết tải

| Thuật ngữ | Nghĩa |
|---|---|
| **Admission control** | Quyết định ai được vào hệ thống, chặn trước khi tốn tài nguyên. |
| **Load shedding** | Đang quá tải → chủ động trả lỗi **nhanh** thay vì xếp hàng. |
| **Backpressure** | Tín hiệu ngược từ nơi chậm lên nơi nhanh để nó giảm tốc. |
| **Bulkhead** | Chia tài nguyên thành khoang riêng để một phần hỏng không lan ra. |
| **Circuit breaker** | Dependency hỏng → ngắt gọi trong một khoảng, khỏi chờ timeout vô ích. |

## JVM

| Thuật ngữ | Nghĩa |
|---|---|
| **Virtual thread** | Thread nhẹ của Java 21. Giải quyết nghẽn *thread*, **không** giải quyết nghẽn *connection pool*. |
| **Pinning** | Virtual thread bị ghim vào carrier thread (thường do `synchronized` quanh IO) → mất lợi thế. |
| **Allocation rate** | Byte/giây cấp phát. Cao → GC chạy liên tục dù heap chưa đầy. |
| **Flame graph** | Biểu đồ stack theo thời gian/bộ nhớ. Rộng = tốn nhiều, không phải sâu = tốn nhiều. |
