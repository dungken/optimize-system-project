# Phụ thuộc giữa các phase

```mermaid
flowchart LR
    P0["0<br/>Đo lường"] --> P1["1<br/>Baseline"]
    P1 --> P2["2<br/>Database"]
    P2 --> P3["3<br/>Concurrency"]
    P3 --> P4["4<br/>Cache"]
    P4 --> P5["5<br/>Admission"]
    P5 --> P6["6<br/>JVM"]
    P2 --> P8["8<br/>Scale out"]
    P5 --> P8
    P7["7<br/>Frontend"] --> P9["9<br/>Tổng kết"]
    P3 --> P9
    P6 --> P9
    P8 --> P9
```

## Vì sao thứ tự này

| Quy tắc | Lý do |
|---|---|
| 0 trước tất cả | Không đo được thì mọi thứ sau là đoán |
| 1 trước 2 | Phải có baseline tệ để so sánh |
| 2 trước 3 | Sửa index trước khi sửa lock — nếu không, lock contention bị index chậm che mất |
| 3 trước 4 | Cache che mất lock contention → không học được gì về concurrency |
| 4 trước 5 | Phải biết công suất thật mới đặt được ngưỡng load shedding |
| 6 gần cuối | JVM tuning là 5-10% cuối. Làm sớm thì tối ưu nhầm chỗ |
| 7 độc lập | Frontend không phụ thuộc backend đã tối ưu hay chưa |
| 9 cuối | Cần đủ số liệu để tổng kết |

**Sai lầm phổ biến nhất:** nhảy vào Phase 6 (GC flag) ngay từ đầu vì nó "nghe giống tối ưu".
Thực tế bottleneck ở Phase 1 là lock và index — tune GC lúc đó không đổi được gì.

## Đường tối giản (~5,5 tuần)

```mermaid
flowchart LR
    P0["0 Đo lường<br/>1 tuần"] --> P1["1 Baseline<br/>4 ngày"]
    P1 --> P2["2 Database<br/>1,5 tuần"]
    P2 --> P3["3 Concurrency<br/>2 tuần"]
    P3 --> P9["9 Tổng kết<br/>3 ngày"]
```

Bỏ 4-8 vẫn là dự án tốt. Bỏ 0 hoặc 9 thì dự án mất hết giá trị học tập.
