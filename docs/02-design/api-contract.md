# API contract

Base: `http://localhost:8080`

## Endpoint

| Method | Path | Auth | Idempotent | Cache | Phase |
|---|---|---|---|---|---|
| GET | `/events` | — | ✓ | 60s | 1 |
| GET | `/events/{id}` | — | ✓ | 60s + jitter | 1 |
| POST | `/reservations` | user | ✓ (header) | — | 1 |
| POST | `/orders` | user | ✓ (resId) | — | 1 |
| GET | `/reservations/{id}` | user | ✓ | — | 1 |
| GET | `/queue/{eventId}/position` | user | ✓ | — | 5 |
| GET | `/queue/{eventId}/stream` | user | — | — | 5 (SSE) |
| GET | `/actuator/prometheus` | — | ✓ | — | 0 |

## `GET /events` — keyset pagination

```http
GET /events?cursor=eyJpZCI6MTAwfQ&limit=20
```
```json
{
  "items": [
    { "id": 101, "name": "Concert X", "venue": "SVĐ A",
      "startsAt": "2026-12-01T19:00:00Z", "minPriceCents": 50000, "available": 847 }
  ],
  "nextCursor": "eyJpZCI6MTIxfQ"
}
```

**Không dùng `?page=N&size=20`.** Lý do: `OFFSET 100000` buộc Postgres đọc và bỏ 100.000 dòng.
Cursor là `{lastId}` base64 → `WHERE id > :lastId ORDER BY id LIMIT 20` → index scan thuần.
Phase 2 sẽ đo chênh lệch ở trang 1 vs trang 10.000.

## `POST /reservations` — hot path ★

```http
POST /reservations
Idempotency-Key: 3f2b8c1e-...     ← BẮT BUỘC, client sinh UUID v4
Content-Type: application/json

{ "ticketTypeId": 42, "qty": 2 }
```

| Status | Khi nào | Body |
|---|---|---|
| `201` | giữ chỗ thành công | `{reservationId, expiresAt, qty}` |
| `200` | replay cùng Idempotency-Key | kết quả lần đầu, **không** tạo mới |
| `409` | hết vé | `{code:"SOLD_OUT", available:0}` |
| `429` | vượt rate limit | `{code:"RATE_LIMITED", retryAfterMs}` |
| `503` | load shed / cache chưa warm | `{code:"TRY_AGAIN", retryAfterMs}` |
| `400` | qty ngoài 1-4, thiếu header | `{code:"INVALID", field}` |

**`Idempotency-Key` bắt buộc, không optional.** Thiếu → `400`. Lý do: client retry là chuyện
bình thường (timeout, user bấm 2 lần, mạng chập). Không có key thì mỗi retry là một vé mới.

Luồng chi tiết: [sequence-reserve.md](../03-diagrams/sequence-reserve.md)

## `POST /orders` — xác nhận

```http
POST /orders
{ "reservationId": 90125, "paymentToken": "mock_ok" }
```

| Status | Khi nào |
|---|---|
| `201` | `{orderId, amountCents, status:"PAID"}` |
| `409` | reservation đã `EXPIRED` / `CANCELLED` / đã có order |
| `402` | payment mock trả fail (`paymentToken: "mock_fail"`) |

`paymentToken` nhận 3 giá trị mock: `mock_ok`, `mock_fail`, `mock_slow` (sleep 2s — để test
timeout và circuit breaker ở Phase 5).

Luồng: [sequence-confirm.md](../03-diagrams/sequence-confirm.md)

## `GET /queue/{eventId}/stream` — SSE (Phase 5)

```
event: position
data: {"position": 12431, "etaSec": 180}

event: admitted
data: {"token": "...", "validForSec": 120}
```

Phase 7 sẽ đo SSE vs polling: băng thông, số connection, độ trễ cập nhật.

## Quy ước lỗi

```json
{ "code": "SOLD_OUT", "message": "Hết vé", "traceId": "4bf92f...", "retryAfterMs": null }
```

`traceId` khớp với Jaeger — dán vào Jaeger UI là thấy toàn bộ luồng. Đây là thứ tiết kiệm
hàng giờ debug ở Phase 3.

## Header chung

| Header | Hướng | Vai trò |
|---|---|---|
| `Idempotency-Key` | request | bắt buộc cho mọi POST tạo mới |
| `X-Request-Id` | cả hai | tương quan log, sinh nếu client không gửi |
| `Retry-After` | response | kèm `429`/`503`, đơn vị giây |
| `traceparent` | cả hai | W3C trace context, OTel tự xử lý |
