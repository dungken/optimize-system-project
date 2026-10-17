# Hàng chờ ảo (Phase 5)

Khi 50.000 người vào cùng lúc mà hệ thống chỉ xử lý được 5.000 rps, lựa chọn không phải
"nhận hết hay từ chối hết" mà là **xếp hàng có thông tin**.

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as App
    participant R as Redis
    participant W as Admission Worker

    C->>A: POST /queue/{eventId}/join
    A->>R: ZADD queue:{eventId} {now_ms} {userId}
    A->>R: ZRANK queue:{eventId} {userId}
    R-->>A: rank = 12430
    A-->>C: 202 {position: 12431, etaSec: 180}

    C->>A: GET /queue/{eventId}/stream (SSE)
    activate A
    loop mỗi 2s
        A->>R: ZRANK queue:{eventId} {userId}
        A-->>C: event: position<br/>data: {position, etaSec}
    end

    Note over W,R: Worker nhả người theo công suất thật
    W->>R: ZPOPMIN queue:{eventId} 500
    W->>R: SETEX admit:{userId} 120 1
    A->>R: GET admit:{userId}
    R-->>A: 1
    A-->>C: event: admitted<br/>data: {validForSec: 120}
    deactivate A

    C->>A: POST /reservations (có token admit)
    A-->>C: 201
```

## Tốc độ nhả người = công suất đo được, không phải con số đoán

```
nhả_mỗi_giây = throughput_đo_được × 0,8      ← chừa 20% dự phòng
```

Lấy từ chính Prometheus (`rate(reservation_attempts_total[1m])`), không hardcode. Nếu
hardcode thì khi hệ thống chậm đi (GC, DB chậm) worker vẫn nhả đều → quá tải → sập.

Đây là **backpressure**: tín hiệu từ nơi chậm ngược lên nơi điều phối.

## ETA tính thế nào

```
etaSec = position / nhả_mỗi_giây
```

Thà cho ETA thô mà có, hơn là không có gì. Người dùng chờ 3 phút **biết mình đang chờ 3 phút**
sẽ không F5 liên tục — và F5 liên tục chính là thứ nhân đôi tải.

Đây là tối ưu **hành vi người dùng**, không phải tối ưu code. Hiệu quả thường lớn hơn.

## SSE vs polling — đo ở Phase 7

| | Polling 2s | SSE |
|---|---|---|
| Request/phút/user | 30 | 1 (giữ kết nối) |
| Băng thông 50k user | ~25.000 req/s chỉ để hỏi vị trí | ~0 |
| Connection giữ | 0 | 50.000 |
| Độ trễ cập nhật | ≤ 2s | ~0 |

SSE thắng về số request nhưng phải giữ 50.000 connection — đó là lý do cần virtual threads.
Với platform thread, 50.000 connection = 50.000 thread = ~50GB stack. Không khả thi.

**Đây là chỗ virtual thread thực sự thắng** — khác với Phase 3.5 nơi nó không giúp được gì
vì nghẽn nằm ở connection pool, không ở thread.
