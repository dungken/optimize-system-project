# Redis key design

## Danh mục key

| Key | Type | TTL | Dùng để | Phase |
|---|---|---|---|---|
| `stock:{ttId}` | STRING (int) | ∞ | Bộ đếm tồn, giảm atomic qua Lua | 3.4 |
| `idem:{key}` | STRING | 24h | → reservationId, chống retry trùng | 3.4 |
| `hold:{resId}` | STRING | 600s | Giữ chỗ; key expire → trả vé | 3.4 |
| `queue:{eventId}` | ZSET | — | Hàng chờ, score = epoch ms | 5 |
| `rl:{userId}` | STRING | 1s | Token bucket rate limit | 5 |
| `event:{eventId}` | HASH | 60s ± jitter | Cache catalog | 4 |
| `bloom:tickettypes` | Bloom | ∞ | Chống cache penetration | 4 |

## Quy ước đặt tên

`{domain}:{id}` — một dấu hai chấm, không lồng nhau. Lý do: `SCAN MATCH stock:*` phải quét
đúng nhóm khi debug, và key dài tốn RAM thật (10k key × 20 byte = 200KB, nhỏ, nhưng
key kiểu `app:prod:booking:inventory:stock:12345` thì không còn nhỏ).

**Không** dùng `KEYS` trong code. Chỉ `SCAN` khi debug thủ công.

## Lua: giữ chỗ atomic

File: `backend/src/main/resources/redis/reserve.lua`

```lua
-- KEYS[1]=stock:{ttId}  KEYS[2]=idem:{key}
-- ARGV[1]=qty  ARGV[2]=reservationId  ARGV[3]=idemTtlSec
local prev = redis.call('GET', KEYS[2])
if prev then return {1, prev} end                      -- 1 = trùng, trả kết quả cũ

local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil then return {-2, ''} end               -- -2 = cache chưa warm
if stock < tonumber(ARGV[1]) then return {-1, ''} end  -- -1 = hết vé

redis.call('DECRBY', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
return {0, ARGV[2]}                                    -- 0 = ok
```

**Vì sao phải là Lua:** `GET` rồi `DECRBY` từ phía client **không** atomic. Giữa hai lệnh,
49.999 request khác có thể chen vào → oversell. Lua chạy single-threaded trong Redis nên cả
khối là một đơn vị nguyên tử, không cần lock phân tán.

**Mã trả về** là một hợp đồng — map sang HTTP status:

| Lua | Nghĩa | HTTP |
|---|---|---|
| `0` | giữ chỗ thành công | `201` |
| `1` | idempotent replay | `200` + kết quả cũ |
| `-1` | hết vé | `409 SOLD_OUT` |
| `-2` | cache chưa warm | `503` + trigger warm, client retry |

## Lua: trả vé

File: `backend/src/main/resources/redis/release.lua`

```lua
-- KEYS[1]=stock:{ttId}  KEYS[2]=released:{resId}
-- ARGV[1]=qty  ARGV[2]=ttlSec
-- Chốt chống trả vé 2 lần: nếu released:{resId} đã tồn tại thì bỏ qua
if redis.call('SETNX', KEYS[2], '1') == 0 then return 0 end
redis.call('EXPIRE', KEYS[2], ARGV[2])
redis.call('INCRBY', KEYS[1], ARGV[1])
return 1
```

`SETNX` là chốt quan trọng: cả keyspace notification **và** `ReleaseJob` đều có thể trả cùng
một vé. Không có chốt này thì vé bị trả 2 lần → `stock` phình lên → **oversell**.

Đây chính là ví dụ tối ưu tạo ra bug: thêm cơ chế thứ hai cho đáng tin cậy, lại sinh ra
đường oversell mới.

## Warm cache

`stock:{ttId}` là source of truth tạm thời trong lúc flash-sale. Nạp trước khi mở bán:

```
sale_starts_at - 5 phút  →  SET stock:{ttId} = total - reserved - sold  (đọc từ DB)
```

Nếu Redis restart giữa lúc bán: `-2` trả về `503`, trigger warm lại từ DB. **Không** để
request tự warm (hàng nghìn request cùng warm = stampede).

## Reconciliation Redis ↔ DB

Chạy mỗi 60s trong `worker/ReconciliationJob.java`:

```
redis_stock    = GET stock:{ttId}
db_available   = total - reserved - sold   (từ PG primary)

lệch = redis_stock - db_available
```

| Tình huống | Nghĩa | Xử lý |
|---|---|---|
| `lệch == 0` | khớp | ghi metric, không làm gì |
| `lệch < 0` | Redis bán nhiều hơn DB ghi | **bình thường** — Kafka đang trễ. Chỉ báo khi kéo dài > 5 phút |
| `lệch > 0` | Redis có nhiều vé hơn thực tế | **NGUY HIỂM** — nguồn oversell. Báo động + hạ `stock` về `db_available` |

**Quy tắc ai thắng: DB luôn thắng.** Redis là cache của sự thật, không phải sự thật.
ADR: [0003](../06-decisions/0003-redis-la-cache-khong-phai-su-that.md)
