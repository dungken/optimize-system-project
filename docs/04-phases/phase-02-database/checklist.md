# Phase 2 — Exit checklist

## Phải đạt

- [ ] Query/request của `GET /events` và `GET /events/{id}` về **hằng số** (không còn N+1)
- [ ] Mọi query hot path có `EXPLAIN ANALYZE` lưu trong `results/phase-02-database/explain/`
- [ ] Mỗi index là **một commit riêng** với số đo before/after
- [ ] Đo được chi phí ghi của index (`INSERT` chậm đi bao nhiêu %)
- [ ] Keyset pagination hoạt động, latency **phẳng** từ trang 1 đến 10.000
- [ ] `pool-sizing.csv` có đủ 5 mức pool, có đồ thị
- [ ] Pool size đã chọn, có ADR giải thích **vì sao không chọn lớn hơn**
- [ ] Replica `:5433` streaming, lag đo được dưới tải
- [ ] Đường đọc route sang replica, primary nhẹ đi có số liệu
- [ ] `oversell` vẫn = 0 (mọi tối ưu không được phá invariant)
- [ ] Mỗi task có entry trong `OPTIMIZATION_LOG.md`

## Số liệu phải ghi

| Chỉ số | Baseline (P1) | Sau P2 | Δ |
|---|---|---|---|
| p99 `POST /reservations` | | | |
| p99 `GET /events` | | | |
| Throughput (rps) | | | |
| Query/request `GET /events` | | | |
| Query/request `GET /events/{id}` | | | |
| Bytes/response `GET /events` | | | |
| `OFFSET` trang 10.000 (ms) | | | |
| Keyset trang 10.000 (ms) | | | |
| Pool size tối ưu | 10 (default) | | |
| DB QPS | | | |
| Replication lag p99 | — | | |
| `INSERT` 100k dòng (giây) — trước/sau index | | | |

## Câu hỏi phải trả lời được

1. Pool size tối ưu là bao nhiêu, và vì sao pool lớn hơn **tệ hơn**?
2. Index nào cho cải thiện lớn nhất? Index nào gần như vô dụng?
3. Partial index nhỏ hơn index đầy đủ bao nhiêu lần? Vì sao?
4. 3 cách sửa N+1 — cái nào nhanh nhất, cái nào dễ bảo trì nhất? Chọn cái nào?
5. Thứ tự cột trong composite index có thực sự quan trọng? Số liệu chứng minh?
6. Nghẽn giờ đã dịch sang đâu?

Câu 6 là giả thuyết cho Phase 3. Viết ra trước khi sang.
