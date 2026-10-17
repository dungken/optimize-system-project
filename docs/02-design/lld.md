# Low Level Design

Chi tiết tách theo chủ đề:

| Chủ đề | File |
|---|---|
| Schema, DDL, ERD, index | [data-model.md](data-model.md) |
| Redis key, Lua script | [redis-keys.md](redis-keys.md) |
| REST API | [api-contract.md](api-contract.md) |
| Metric catalog | [observability.md](observability.md) |
| Tính pool size, throughput | [capacity.md](capacity.md) |

## Tổ chức package backend

Theo **domain**, không theo tầng. Lý do: hot path nằm gọn một chỗ — khi profiler trỏ vào
`reservation/`, bạn biết ngay phải đọc gì.

```
com.booking
├── common/        config · error · idempotency · metrics   (không chứa business)
├── catalog/       api · domain · repo · cache              (ĐỌC nhiều → học cache)
├── reservation/   api · domain · repo · strategy · expiry  (★ HOT PATH)
├── order/         api · domain · repo
├── admission/     rate limit · load shed · circuit breaker (Phase 5)
├── queue/         waiting room ZSET + SSE                  (Phase 5)
└── worker/        Kafka consumer · reconciliation          (Phase 5)
```

**Quy tắc phụ thuộc**
- `common` không phụ thuộc domain nào.
- `catalog` và `reservation` không gọi nhau trực tiếp.
- `api` → `strategy` → `repo`. Không bao giờ `api` → `repo`.

## Pattern trung tâm: ReserveStrategy

Phase 3 so sánh 5 cách giữ chỗ. Thiết kế để **đổi bằng config**, không phải viết lại:

```java
public interface ReserveStrategy {
    ReserveResult reserve(long ticketTypeId, int qty, UUID idemKey);
    String name();                      // vào metric tag để so sánh
}
```

| Implementation | Phase | Cơ chế |
|---|---|---|
| `PessimisticLockStrategy` | 3.1 | `SELECT ... FOR UPDATE` |
| `OptimisticLockStrategy` | 3.2 | `@Version` + retry |
| `AtomicUpdateStrategy` | 3.3 | một câu `UPDATE ... WHERE` |
| `RedisLuaStrategy` | 3.4 | `reserve.lua` |
| *(virtual threads)* | 3.5 | không phải strategy — là cấu hình runtime trên nền 3.3/3.4 |

Chọn bằng `app.reserve.strategy=atomic-update` trong `application.yml`.

**Vì sao thiết kế vậy:** cho phép chạy 5 chiến lược dưới **cùng một lần k6**, cùng data,
cùng máy. Không có interface này thì Phase 3 thành 5 lần viết lại và số đo không so sánh được.

## Vòng đời Reservation

State machine: [03-diagrams/state-reservation.md](../03-diagrams/state-reservation.md)

```
HELD ──(payment ok)──> CONFIRMED ──(huỷ)──> CANCELLED ──> trả vé
  └──(TTL 10 phút)──> EXPIRED ────────────────────────────> trả vé
```

Hai nhánh trả vé là nơi bug trốn. Mỗi nhánh có **hai** cơ chế:

| Cơ chế | Vai trò | Độ tin cậy |
|---|---|---|
| Redis keyspace notification trên `hold:{resId}` | phản ứng tức thì | có thể mất event |
| `ReleaseJob` quét DB mỗi 30s | lưới an toàn | chậm nhưng không mất |

Dùng cả hai vì keyspace notification là **best-effort** — Redis không đảm bảo giao. Chỉ dựa
vào nó thì vé rò rỉ âm thầm.

## Idempotency end-to-end

```
Client sinh UUID ──> header Idempotency-Key
                       │
                       ├─ Redis  idem:{key} → resId   (nhanh, TTL 24h)
                       └─ DB     UNIQUE(idempotency_key)  ← chốt cuối
```

Redis trả lời nhanh cho 99% case. UNIQUE constraint ở DB bắt case Redis mất key.
Hai lớp vì Redis có thể evict, DB thì không.
