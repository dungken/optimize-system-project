# Phase 1 — Exit checklist

## Phải đạt

- [ ] `make seed` xong < 10 phút, `orders` có 5M dòng (`SELECT count(*)` xác nhận)
- [ ] `smoke.js` pass 100%, 0 lỗi
- [ ] `load.js` và `spike.js` chạy xong, JSON trong `results/`
- [ ] Flame graph CPU + allocation đã chụp tại tải đỉnh
- [ ] Grafana screenshot: RED + JVM + DB tại thời điểm spike
- [ ] `results/baseline.md` hoàn chỉnh
- [ ] **Không sửa bất kỳ tối ưu nào** — kể cả thấy rõ chỗ sai

## results/baseline.md phải có

| Mục | Bắt buộc |
|---|---|
| Bảng số liệu (p50/95/99, throughput, error rate, pool, GC, deadlock) | ✓ |
| Điều kiện đo (script, VU, data size, pool, heap, shared_buffers) | ✓ |
| Flame graph CPU + allocation | ✓ |
| Screenshot Grafana | ✓ |
| Số query mỗi request của `GET /events` và `GET /events/{id}` | ✓ |
| Oversell có xảy ra không, bao nhiêu | ✓ |
| **Nhận định: 3 nghẽn nghi ngờ nhất, kèm bằng chứng** | ✓ |

Mục cuối quan trọng nhất — nó là **giả thuyết** cho Phase 2. Viết trước khi sang phase sau,
rồi đối chiếu xem đoán đúng mấy cái.

## Số liệu baseline — điền vào đây

| Chỉ số | Giá trị đo được |
|---|---|
| p50 `POST /reservations` | |
| p95 | |
| p99 | |
| Throughput tối đa (rps) | |
| Error rate (%) | |
| Lỗi chủ yếu loại gì | |
| `hikaricp_connections_pending` đỉnh | |
| Deadlock count | |
| GC pause p99 | |
| Query/request `GET /events` | |
| Query/request `GET /events/{id}` | |
| Oversell | |
| DB CPU % tại đỉnh | |
| App CPU % tại đỉnh | |

Con số này được **trích dẫn lại ở mọi phase sau**. Ghi cẩn thận.
