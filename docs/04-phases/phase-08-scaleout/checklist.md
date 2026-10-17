# Phase 8 — Exit checklist

## Phải đạt

- [ ] 4 instance chạy sau nginx, health check loại instance chết
- [ ] Hoàn toàn stateless — không state in-memory nào ảnh hưởng tính đúng đắn
- [ ] Scheduled job **không** chạy trùng 4 lần
- [ ] Mọi panel p99 dùng `histogram_quantile`, **không** `avg(p99)`
- [ ] Pool × 4 ≤ `max_connections`, đã kiểm bằng đo
- [ ] Đồ thị scale 1→4 instance (thực tế vs tuyến tính)
- [ ] **Chỉ ra được shared bottleneck** và chứng minh bằng số liệu
- [ ] Partition `orders` hoạt động, đo được pruning
- [ ] Chaos: kill instance / Redis / DB chậm / giới hạn RAM — hệ thống degrade có kiểm soát
- [ ] `scripts/chaos/reset.sh` hoàn tác sạch, xác nhận bằng `tc qdisc show`
- [ ] `oversell == 0` qua mọi test ở quy mô 4 instance

## Số liệu phải ghi

| Instance | Throughput | p99 | Redis ops/s | PG connection | PG CPU % | App CPU % |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |

### Hiệu suất scale

| Từ → đến | Tăng lý tưởng | Tăng thực tế | Hiệu suất |
|---|---|---|---|
| 1 → 2 | 100% | | |
| 2 → 4 | 100% | | |
| 1 → 4 | 300% | | |

### Shared bottleneck

| Tài nguyên | % sử dụng ở 4 instance | Là nghẽn? |
|---|---|---|
| App CPU | | |
| Redis CPU (single core) | | |
| PG CPU | | |
| PG connection | | |
| Disk IO | | |
| Network | | |

## Câu hỏi phải trả lời được

1. Hiệu suất scale 1→4 là bao nhiêu %? Phần mất đi đi đâu?
2. Shared bottleneck là gì? Bằng chứng nào?
3. Nếu phải lên 10 instance, phải sửa gì trước?
4. Giảm số lệnh Redis/request có làm throughput tăng? Số liệu chứng minh giả thuyết?
5. `avg(p99)` và `histogram_quantile(0.99)` chênh nhau bao nhiêu? Vì sao cái đầu sai?
