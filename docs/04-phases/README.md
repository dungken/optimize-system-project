# 10 giai đoạn

Mỗi phase là một thư mục, chứa 3 file:

| File | Trả lời |
|---|---|
| `README.md` | Mục tiêu, bối cảnh, bài học kỳ vọng |
| `tasks.md` | Chia task có ID, estimate, phụ thuộc, output |
| `checklist.md` | Exit criteria — làm xong là xong, không mơ hồ |

## Bảng tổng

| Phase | Tên | Thời gian | Bỏ được? | Nghẽn tấn công |
|---|---|---|---|---|
| [00](phase-00-observability/) | Hạ tầng đo lường | 1 tuần | ❌ **không** | — (điều kiện tiên quyết) |
| [01](phase-01-baseline/) | Bản ngây thơ + baseline | 3-4 ngày | ❌ **không** | — (mốc so sánh) |
| [02](phase-02-database/) | Tầng database | 1,5 tuần | ❌ nhiều cải thiện nhất | index, N+1, pool |
| [03](phase-03-concurrency/) | Concurrency & correctness | 2 tuần | ❌ **giá trị cao nhất** | lock contention |
| [04](phase-04-cache/) | Tầng cache | 1 tuần | ✅ | đọc nóng |
| [05](phase-05-admission/) | Admission control | 1,5 tuần | ✅ | quá tải |
| [06](phase-06-jvm/) | JVM & runtime | 1 tuần | ✅ | GC, allocation |
| [07](phase-07-frontend/) | Frontend | 1 tuần | ✅ | network, render |
| [08](phase-08-scaleout/) | Scale out & resilience | 1 tuần | ✅ | shared bottleneck |
| [09](phase-09-report/) | Tổng kết | 3 ngày | ❌ **không** | — (đúc kết) |

**Tổng ~11-12 tuần.** Đường tối giản: **00 → 01 → 02 → 03 → 09** (~5,5 tuần).

Thứ tự và lý do: [../03-diagrams/phase-dependency.md](../03-diagrams/phase-dependency.md)

## Quy tắc chung mọi phase

1. **Mở `business.json` dashboard trước mọi lần test.** Đúng trước, nhanh sau.
2. **Một task một commit.** Commit message ghi số đo: `perf(db): index event_id, p99 2100ms→340ms`
3. **Mỗi task xong → một entry trong [OPTIMIZATION_LOG.md](../../OPTIMIZATION_LOG.md).**
   Không có số liệu thì task chưa xong.
4. **Chaos xong → chạy `scripts/chaos/reset.sh`.** `tc` rule sống đến khi reboot.
5. **Dự đoán trước khi đo.** Chỗ lệch nhiều nhất là chỗ bạn hiểu sai hệ thống.

## Quy ước ID task

`P{phase}-T{số}` — ví dụ `P3-T07`. Dùng trong commit message và OPTIMIZATION_LOG để truy vết.
