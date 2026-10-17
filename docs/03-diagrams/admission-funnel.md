# Phễu điều tiết tải (Phase 5)

Hệ thống tốt không phải hệ thống không bao giờ quá tải, mà là hệ thống **suy giảm có kiểm soát**.

```mermaid
flowchart TB
    IN["50.000 req/s đổ vào"] --> RL{"Rate limit<br/>token bucket<br/>per user + per IP"}
    RL -- "vượt quota" --> E429["429 Too Many Requests<br/>+ Retry-After"]
    RL -- ok --> LS{"Load shed<br/>p99 nội bộ > ngưỡng?"}
    LS -- "đang quá tải" --> E503["503 fail fast<br/>KHÔNG xếp hàng"]
    LS -- ok --> Q{"Waiting room<br/>ZSET Redis"}
    Q -- "còn phải chờ" --> E202["202 + vị trí thứ N<br/>SSE cập nhật"]
    Q -- "đến lượt" --> APP["App ~5.000 req/s"]
    APP --> OK["201 giữ chỗ"]
```

## Thứ tự 3 tầng lọc — không được đổi

| Tầng | Chi phí mỗi request | Vì sao đặt ở đây |
|---|---|---|
| Rate limit | 1 lệnh Redis | Chặn abuse trước, rẻ nhất |
| Load shed | 1 phép so sánh in-memory | Rẻ hơn Redis, nhưng cần rate limit chặn abuse trước |
| Waiting room | 2 lệnh Redis | Đắt nhất, chỉ áp cho request hợp lệ |

Đảo thứ tự → tốn Redis cho cả request abuse. Lọc rẻ trước, đắt sau.

## Vì sao `503` nhanh tốt hơn xếp hàng

```mermaid
flowchart LR
    subgraph BAD["❌ Xếp hàng vô hạn"]
        direction TB
        b1["nhận hết 50k"] --> b2["queue phình"]
        b2 --> b3["mỗi request chờ 30s"]
        b3 --> b4["client timeout ở 10s<br/>và RETRY"]
        b4 --> b5["tải thành 100k"]
        b5 --> b6["sập hoàn toàn"]
    end
    subgraph GOOD["✅ Từ chối sớm"]
        direction TB
        g1["nhận 5k, từ chối 45k"] --> g2["503 trong 1ms"]
        g2 --> g3["client biết ngay,<br/>backoff theo Retry-After"]
        g3 --> g4["5k request được<br/>phục vụ ĐÚNG SLO"]
    end
```

Vòng `b4 → b5` là **retry storm** — nguyên nhân phổ biến nhất của sự cố toàn hệ thống.
Chờ lâu hơn timeout của client là tệ hơn từ chối ngay: client vẫn retry, mà bạn đã tốn
tài nguyên xử lý request không ai còn chờ.

## Ngưỡng load shed lấy ở đâu

```
ngưỡng = p99 đo được ở Phase 4 × 1,5
```

Lấy từ số liệu thật của chính hệ thống, không đoán. Phase 4 phải xong trước Phase 5 chính
vì lý do này — không biết công suất thật thì không đặt được ngưỡng.

## Circuit breaker cho dependency

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> OPEN : lỗi > 50% trong 10s
    OPEN --> HALF_OPEN : sau 30s
    HALF_OPEN --> CLOSED : 3 request thử đều ok
    HALF_OPEN --> OPEN : còn lỗi
    note right of OPEN
        Trả lỗi NGAY, không gọi xuống.
        Cho dependency thời gian hồi phục
        thay vì bồi thêm tải.
    end note
```

Không có breaker: payment chậm 2s × 1.000 request = pool cạn = **toàn bộ API chết**,
kể cả `GET /events` không liên quan gì đến payment.
