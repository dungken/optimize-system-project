# Phase 2 — Tầng Database

`1,5 tuần` · **không bỏ được** — 80% cải thiện dễ nhất nằm ở đây

## Mục tiêu

Sửa mọi thứ sai ở tầng DB **trước khi** nghĩ đến cache hay concurrency.

## Vì sao làm trước Phase 3

Nếu thêm cache (Phase 4) hoặc đổi chiến lược lock (Phase 3) trước, chúng sẽ **che mất**
vấn đề index. Bạn sẽ thấy p99 giảm và kết luận sai nguyên nhân.

Thứ tự ở đây không tuỳ ý: query chậm làm lock bị giữ lâu hơn, nên **sửa query trước thì
lock contention tự giảm**. Làm ngược lại thì bạn tối ưu lock trên nền query chậm —
tốn công mà kết luận sai.

## Phạm vi

| Nhóm | Nội dung |
|---|---|
| Query | `EXPLAIN ANALYZE`, N+1, projection |
| Index | composite, covering, **partial**, chi phí ghi |
| Pagination | OFFSET → keyset |
| Pool | Little's Law → đo thực → chọn |
| Replica | streaming replication, routing đọc/ghi |
| Payload | DTO thay entity |

## Bài học kỳ vọng

- **Pool lớn hơn ≠ nhanh hơn.** Hiểu *tại sao* là insight quan trọng nhất phase này:
  Postgres song song giới hạn bởi CPU core, không bởi số connection.
- `rows` trong `EXPLAIN` là **estimate**; `actual rows` là thật. Lệch nhiều → statistics cũ
  → planner chọn sai → `ANALYZE`.
- Index **không miễn phí**: mỗi index làm `INSERT` chậm thêm và chiếm disk.
- Partial index trên `WHERE status = 0` nhỏ hơn index đầy đủ **~100×** khi chỉ 1% dòng là HELD.
- `OFFSET 100000` buộc Postgres đọc và **bỏ** 100.000 dòng.

## Bẫy

| Bẫy | Hậu quả |
|---|---|
| Thêm cả 5 index một lúc | Không biết index nào có tác dụng |
| Chỉ đo chiều đọc | Bỏ sót chi phí ghi, Phase 5 mới phát hiện |
| Tin công thức pool size | Công thức HikariCP cho SSD NVMe không còn chính xác — phải đo |
| `EXPLAIN` không có `ANALYZE` | Chỉ thấy kế hoạch, không thấy thực tế |
| Quên `ANALYZE` sau khi seed | Planner dùng statistics rỗng → chọn seq scan vô lý |
