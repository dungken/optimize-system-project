# Invariant và cách test

Invariant = điều kiện **luôn** đúng, bất kể tải, bất kể sự cố. Đây là thứ không được
đánh đổi để lấy hiệu năng.

## Danh sách

### I1 — Không bán vượt
```
reserved + sold <= total          (với mọi ticket_type, mọi lúc)
```

| Bảo vệ bởi | Lớp |
|---|---|
| Lua: `if stock < qty then return -1` | 1 |
| SQL: `WHERE reserved + sold + qty <= total` | 2 |
| `CHECK (reserved + sold <= total)` | 3 ← chốt cuối |
| `ReconciliationJob` phát hiện `drift > 0` | 4 |
| Metric `inventory_oversell_total` + alert | 5 |

**Test:** `OversellConcurrencyTest`
```
Chuẩn bị: inventory có total = 100
Chạy:     1.000 thread cùng gọi reserve(qty=1)
Assert:   đúng 100 thành công, 900 nhận SOLD_OUT
          reserved + sold == 100
          inventory_oversell_total == 0
Lặp:      với CẢ 5 strategy (@ParameterizedTest)
```

### I2 — Không rò rỉ vé
```
Mọi reservation ở trạng thái cuối (EXPIRED/CANCELLED)
đều đã trả vé về stock, đúng một lần
```

| Bảo vệ bởi | |
|---|---|
| `HeldExpiryListener` (Redis keyspace notification) | tức thì, best-effort |
| `ReleaseJob` quét DB 30s | lưới an toàn |
| `SETNX released:{resId}` trong `release.lua` | chống trả 2 lần |

**Test:** `ExpiryReleaseTest` + `DoubleReleaseTest`
```
ExpiryReleaseTest:
  Chuẩn bị: 50 reservation HELD, expires_at trong quá khứ
  Chạy:     ReleaseJob
  Assert:   stock tăng đúng tổng qty, tất cả chuyển EXPIRED

DoubleReleaseTest:
  Chuẩn bị: 1 reservation hết hạn
  Chạy:     listener VÀ job cùng lúc (2 thread)
  Assert:   stock tăng đúng MỘT lần
            release_duplicate_total == 1  ← chốt đã làm việc
```

`DoubleReleaseTest` là test quan trọng mà nhiều người bỏ qua. Nó bắt được loại bug mà
chính việc *tăng độ tin cậy* đã tạo ra.

### I3 — Idempotency
```
N request cùng Idempotency-Key → đúng 1 reservation, N response giống nhau
```

**Test:** `IdempotencyTest`
```
Chạy:   100 thread cùng POST /reservations với CÙNG một Idempotency-Key
Assert: count(reservations WHERE idempotency_key = X) == 1
        100 response có cùng reservationId
        reserved tăng đúng qty (không phải 100 × qty)
```

### I4 — Một reservation sinh tối đa một order
```
UNIQUE(orders.reservation_id)
```

**Test:** gửi `POST /orders` 10 lần song song cùng `resId` → 1 order, 9 lần `409`.

### I5 — Chuyển trạng thái hợp lệ
```
Chỉ các chuyển trạng thái trong state machine được phép
```

**Test:** `ReservationStateTest` (unit) — thử mọi cặp trạng thái, assert cái không hợp lệ
bị từ chối.

Bảng chuyển trạng thái: [../03-diagrams/state-reservation.md](../03-diagrams/state-reservation.md)

### I6 — `stock` không nằm trong cache local
```
Không instance nào được cache stock ở Caffeine
```

**Test:** `StockNotInCaffeineTest` — regression test, chặn người sau (hoặc chính bạn
3 tuần sau) thêm `@Cacheable` vào chỗ sai.

Vì sao: 4 instance × Caffeine = 4 giá trị `stock` khác nhau → mỗi instance tưởng còn vé →
oversell. Đây là bug rất khó debug vì nó chỉ xuất hiện khi chạy nhiều instance.

## Chạy invariant test

```bash
mvn test -Dtest='*ConcurrencyTest,*IdempotencyTest,*ReleaseTest'
```

Thêm vào `make bench` để chạy trước mọi lần đo hiệu năng — **đúng trước, nhanh sau**.

## Không mock DB/Redis

Invariant test phải dùng PG và Redis **thật** (đã chạy sẵn trên máy). Race condition không
tồn tại với mock.

```
Schema test riêng:  booking_test
Redis DB riêng:     SELECT 15
Dọn sau mỗi test:   TRUNCATE + FLUSHDB (chỉ DB 15)
```
