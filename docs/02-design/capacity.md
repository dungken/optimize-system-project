# Capacity planning

Mục đích: **tính trước** rồi **đo lại**, thay vì đoán. Sai số giữa tính và đo chính là bài học.

## Little's Law

```
L = λ × W

L = số việc đang xử lý đồng thời
λ = tốc độ đến (req/s)
W = thời gian xử lý mỗi việc (s)
```

## Tính pool size

Đích: 5.000 rps. Mỗi request chiếm connection bao lâu?

| Chiến lược | Thời gian giữ connection | Pool cần |
|---|---|---|
| Pessimistic (`FOR UPDATE`) | ~50ms (gồm chờ lock) | 5000 × 0,050 = **250** ❌ |
| Atomic UPDATE | ~2ms | 5000 × 0,002 = **10** ✅ |
| Redis Lua (DB ghi async) | ~0ms trên hot path | **gần 0** ✅ |

Đây là con số giải thích toàn bộ Phase 3: pessimistic lock cần pool 250 — mà Postgres mặc
định `max_connections = 100`. Nghĩa là chiến lược đó **không thể** đạt 5.000 rps, bất kể
tune gì. Không phải vấn đề cấu hình, là vấn đề thiết kế.

## Vì sao pool lớn hơn không nhanh hơn

Postgres xử lý song song giới hạn bởi **CPU core** và **disk**, không bởi số connection.
Máy dev có **12 core**.

```
pool = 10   →  10 query song song, mỗi cái chạy đủ nhanh
pool = 100  →  100 query tranh 12 core → mỗi cái chậm 8×, cộng chi phí context switch
               → throughput GIẢM, p99 TĂNG
```

Công thức tham khảo (HikariCP): `pool = ((core × 2) + số_spindle)` → `(12 × 2) + 1 = 25`.
Với SSD NVMe, "spindle" không còn nghĩa — **phải đo**, đừng tin công thức.

Phase 2 đo pool = 5/10/20/50/100 và vẽ đồ thị. Dự đoán: đỉnh ở khoảng 15-25, sau đó đi xuống.

## Ngân sách latency cho p99 < 200ms

```
nginx                    2ms
rate limit (Redis)       1ms
reserve.lua (Redis)      2ms
kafka produce (async)    3ms
serialize JSON           2ms
───────────────────────────────
tổng                    10ms   ← còn 190ms dự phòng cho GC pause + đuôi mạng
```

Dự phòng lớn là có chủ ý: p99 bị chi phối bởi **đuôi** (GC pause, TCP retransmit, CPU
scheduling), không bởi đường đi trung bình. Thiết kế cho mean = 10ms để p99 = 200ms.

## Dung lượng Redis

| Key | Số lượng | Byte/key | Tổng |
|---|---|---|---|
| `stock:{ttId}` | 4.000 | ~60 | 240 KB |
| `idem:{key}` | 50.000/phút × 24h TTL | ~100 | ~70 MB ở đỉnh |
| `hold:{resId}` | 1.000 | ~60 | 60 KB |
| `queue:{eventId}` | 50.000 member | ~70 | 3,5 MB |
| `event:{id}` cache | 1.000 | ~500 | 500 KB |

Tổng đỉnh ~75MB. Redis mặc định không giới hạn → đặt `maxmemory 512mb` +
`maxmemory-policy allkeys-lru`.

⚠️ **Bẫy:** `allkeys-lru` có thể evict `stock:{ttId}`! Khi đó Lua trả `-2`. Phải đặt
`stock:` vào Redis DB riêng với policy `noeviction`, hoặc dùng `volatile-lru` và không set
TTL cho `stock:`. Đây là một trong những thứ chaos test ở Phase 3 phải bắt được.

## Throughput khi scale out

```
Ước lượng: 1 instance = 5.000 rps
→ 4 instance = 20.000 rps?   KHÔNG.
```

Phần không chia sẻ được thì scale tuyến tính. Phần chia sẻ thì không:

| Tài nguyên | Chia sẻ? | Giới hạn |
|---|---|---|
| CPU app | không | scale tuyến tính |
| Redis | **có** | single-thread, ~100k ops/s |
| PG primary | **có** | 12 core, max_connections |
| Kafka partition | **có** | song song = số partition |

Redis single-thread là nghẽn chia sẻ rõ nhất. Mỗi request 2 lệnh Redis (rate limit + reserve)
→ 100k / 2 = **50.000 rps** là trần lý thuyết của toàn hệ thống. Phase 8 kiểm chứng con số này.

## Dung lượng disk (ràng buộc thật trên máy dev)

Còn **12GB / 233GB**. Seed đầy đủ cần ~14GB → không đủ.

| Bảng | 50M dòng | 5M dòng (dùng) |
|---|---|---|
| `orders` heap | ~5 GB | ~500 MB |
| `orders` index ×2 | ~4 GB | ~400 MB |
| `reservations` | ~4 GB | ~400 MB |
| `users` | ~1,5 GB | ~300 MB |
| WAL + temp | ~2 GB | ~500 MB |
| **tổng** | **~16 GB** ❌ | **~2 GB** ✅ |

Bù lại bằng cách hạ `shared_buffers` xuống 256MB → data vẫn lớn hơn cache 8× nên seq scan
vs index scan vẫn khác biệt rõ. Chi tiết: [setup-native.md](../05-runbook/setup-native.md)
