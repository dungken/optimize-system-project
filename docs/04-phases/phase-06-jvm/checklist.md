# Phase 6 — Exit checklist

## Phải đạt

- [ ] GC pause p99 < **10ms**
- [ ] Allocation rate giảm, có số liệu before/after
- [ ] Allocation flame graph before/after, nhìn thấy khác biệt
- [ ] 3 GC đã đo trên cùng workload, có bảng so sánh + lựa chọn có lý do
- [ ] Heap size tối ưu tìm bằng **đo**, không bằng công thức
- [ ] Warm-up protocol áp dụng cho mọi lần đo ở phase này
- [ ] Không còn virtual thread pinning (`tracePinnedThreads` im lặng)
- [ ] `oversell == 0`

## Số liệu phải ghi

| Chỉ số | Sau P5 | Sau P6 | Δ |
|---|---|---|---|
| p99 `POST /reservations` | | | |
| GC pause p50 / p99 / max | | | |
| Allocation rate (MB/s) | | | |
| Heap sử dụng ở trạng thái ổn định | | | |
| Throughput | | | |
| CPU % của GC | | | |
| Bytes/response sau khi tối ưu Jackson | | | |

### So sánh GC

| GC | Pause p99 | Pause max | Throughput | CPU overhead |
|---|---|---|---|---|
| G1 (mặc định) | | | | |
| ZGC | | | | |
| Parallel | | | | |

### Heap sizing

| Heap | GC frequency | Pause p99 | Throughput |
|---|---|---|---|
| 512M | | | |
| 1G | | | |
| 2G | | | |
| 4G | | | |
| 8G | | | |

## Câu hỏi phải trả lời được

1. GC nào thắng ở workload này, vì sao? Đánh đổi là gì?
2. Heap tối ưu bao nhiêu? Vì sao lớn hơn **tệ hơn**?
3. Top 3 nguồn allocation là gì? Sửa được bao nhiêu %?
4. Phase này cải thiện p99 bao nhiêu % so với Phase 5? (dự kiến: **nhỏ** — và đó là bài học)
5. Nếu làm Phase 6 ngay sau Phase 1 thì sẽ ra sao?
