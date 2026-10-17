# Vòng đời Reservation

```mermaid
stateDiagram-v2
    [*] --> HELD : POST /reservations<br/>trừ stock trên Redis
    HELD --> CONFIRMED : POST /orders<br/>payment ok
    HELD --> EXPIRED : TTL 10 phút
    HELD --> CANCELLED : DELETE /reservations<br/>hoặc payment fail
    CONFIRMED --> CANCELLED : huỷ / refund
    EXPIRED --> [*] : trả vé về stock
    CANCELLED --> [*] : trả vé về stock
    CONFIRMED --> [*] : hoàn tất

    note right of EXPIRED
        Hai nhánh trả vé là nơi bug trốn.
        Sai ở đây = rò rỉ vé vĩnh viễn,
        không có lỗi nào trong log.
        Test riêng chúng.
    end note
```

## Bảng chuyển trạng thái

| Từ | Đến | Trigger | Tác dụng lên inventory |
|---|---|---|---|
| — | `HELD` | `POST /reservations` | `reserved += qty` |
| `HELD` | `CONFIRMED` | payment ok | `reserved -= qty`, `sold += qty` |
| `HELD` | `EXPIRED` | TTL 10 phút | `reserved -= qty` |
| `HELD` | `CANCELLED` | huỷ / payment fail | `reserved -= qty` |
| `CONFIRMED` | `CANCELLED` | refund | `sold -= qty` |

Mọi chuyển trạng thái phải **giữ nguyên** `reserved + sold <= total`. Chuyển
`HELD → CONFIRMED` là trường hợp duy nhất đổi cả hai cột — phải trong **một** câu UPDATE.

## Trạng thái cuối và bất biến

| Trạng thái | Cuối? | `reserved + sold` |
|---|---|---|
| `HELD` | không | tính vào `reserved` |
| `CONFIRMED` | có | tính vào `sold` |
| `EXPIRED` | có | không tính |
| `CANCELLED` | có | không tính |

## Chuyển trạng thái KHÔNG được phép

```mermaid
stateDiagram-v2
    EXPIRED --> HELD : ❌ không hồi sinh
    CANCELLED --> CONFIRMED : ❌ không xác nhận cái đã huỷ
    CONFIRMED --> HELD : ❌ không lùi
```

Kiểm tra ở hai nơi: guard trong service, và `WHERE status = 0` trong câu `UPDATE`
(làm cho chuyển trạng thái sai thành `rowsAffected = 0` chứ không âm thầm ghi đè).
