# Phase 6 — JVM & Runtime

`1 tuần` · bỏ được

## Mục tiêu

GC pause p99 < 10ms, allocation rate giảm có số liệu.

## Vì sao làm GẦN CUỐI

Đây là **5-10% cuối**, không phải chỗ bắt đầu. Đây cũng là sai lầm phổ biến nhất của người
học tối ưu: nhảy vào GC flag ngay từ đầu vì nó "nghe giống tối ưu".

Ở Phase 1 bottleneck là lock và index. Tune GC lúc đó không đổi được gì — bạn chỉ chuyển
10ms GC pause thành 8ms trên một request đang mất 10.000ms chờ lock.

Chỉ sau khi p99 đã về vài chục ms thì GC pause mới trở thành phần đáng kể của p99.

## Phạm vi

| Nhóm | Nội dung |
|---|---|
| GC | G1 vs ZGC vs Parallel, heap sizing |
| Allocation | flame graph, giảm rác |
| Serialization | chi phí Jackson |
| Profiling sâu | JFR — lock contention, IO wait |
| Virtual threads | pinning |

## Bài học kỳ vọng

- Vì sao micro-optimization thường vô nghĩa — và chính xác khi nào thì không
- Đọc **allocation** flame graph (khác CPU flame graph): rộng = cấp phát nhiều
- Allocation rate cao làm GC chạy liên tục **dù heap chưa đầy**
- Heap lớn hơn không tốt hơn: nhỏ → GC liên tục, lớn → pause dài. Có điểm tối ưu.
- ZGC đổi throughput lấy pause time — đo được cái đánh đổi đó

## Nguồn rác phổ biến

| Nguồn | Cách phát hiện | Cách sửa |
|---|---|---|
| Entity JPA không cần | alloc flame graph | DTO projection |
| Boxing `Long`/`Integer` | alloc flame graph | primitive, `LongStream` |
| `String` concat trong loop | alloc flame graph | `StringBuilder` |
| `Stream` trong hot path | alloc flame graph | for loop thường |
| Jackson tạo node trung gian | JFR | DTO phẳng, `@JsonInclude` |
| Log string format dù log tắt | alloc flame graph | `if (log.isDebugEnabled())` |

## Bẫy

| Bẫy | Hậu quả |
|---|---|
| Copy GC flag từ blog | Flag cho workload khác → tệ hơn mặc định |
| Đo GC mà không warm up | JIT chưa compile → số liệu vô nghĩa |
| Chỉ xem CPU flame graph | Bỏ sót nghẽn allocation |
| Tối ưu allocation chỗ không nóng | Mất thời gian, không đổi p99 |
