# Phase 6 — Task breakdown

| ID | Task | Est | Output |
|---|---|---|---|
| P6-T01 | Warm-up protocol: chạy 2 phút trước khi đo (JIT compile) | 2h | ★ số liệu mới đáng tin |
| P6-T02 | Đo G1 (mặc định) — pause p99, throughput, CPU overhead | 3h | |
| P6-T03 | Đo ZGC — cùng workload, cùng heap | 3h | |
| P6-T04 | Đo Parallel GC — cùng workload | 2h | |
| P6-T05 | Bảng so sánh 3 GC + chọn + lý do | 2h | ★ |
| P6-T06 | Heap sizing: đo 512M / 1G / 2G / 4G / 8G → đồ thị pause + throughput | 5h | ★ tìm điểm tối ưu |
| P6-T07 | Allocation flame graph tại tải đỉnh | 3h | |
| P6-T08 | Tìm top 5 nguồn allocation, ghi lại | 3h | ★ danh sách ưu tiên |
| P6-T09 | Sửa nguồn #1 (thường: entity không cần → DTO projection), đo | 4h | |
| P6-T10 | Sửa nguồn #2, đo | 3h | |
| P6-T11 | Sửa nguồn #3, đo | 3h | |
| P6-T12 | Đo chi phí Jackson: DTO phẳng vs lồng, `@JsonInclude`, writer thủ công | 4h | |
| P6-T13 | JFR bật ở profile `bench`, phân tích lock contention | 4h | |
| P6-T14 | JFR: phân tích IO wait, so với tracing của Jaeger | 3h | |
| P6-T15 | `-Djdk.tracePinnedThreads=full` → tìm pinning, sửa `synchronized` quanh IO | 4h | |
| P6-T16 | *(tuỳ chọn)* GraalVM native image — so thời gian khởi động + RSS | 5h | |
| P6-T17 | `results/phase-06-jvm/jvm-report.md` — before/after flame graph | 3h | |

**Tổng ~56h ≈ 1 tuần** (bỏ T16 nếu thiếu thời gian)

## Thứ tự

```
T01              ← warm-up protocol TRƯỚC tiên, không có thì mọi số đo sai
T02-T05          ← chọn GC
T06              ← heap sizing
T07-T08          ← tìm nguồn allocation
T09-T11          ← sửa, một cái một commit
T12-T15          ← serialization, JFR, pinning
T17              ← tổng kết
```
