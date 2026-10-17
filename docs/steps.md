# 5 vòng tối ưu

**Luật:** mỗi vòng → bấm công tắc → ghi số vào bảng cuối file. Không ghi = chưa xong.

---

## Vòng 0 — Dựng khung (60 phút)

- [ ] `seed.sql`: 200k customers + 2M orders bằng `generate_series`
- [ ] `MeasureFilter` + `QueryCounter` → `meta` trong response
- [ ] `GET /api/orders` bản naive: JPA, lazy load, `OFFSET`, trả entity
- [ ] Trang React: bảng + `MetaBar` + 5 checkbox
- [ ] `shared_buffers=128MB` → buộc data lớn hơn cache

Xong vòng 0: mở trang, thấy `⏱ 812 ms  🔍 101 query  📦 2.1 MB`. **Đó là baseline.**

---

## Vòng 1 — Index (45 phút)

**Naive:** không index → `WHERE customer_id = ?` phải quét 2M dòng.

```sql
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 123;
-- Seq Scan ... actual rows=10 ... Execution Time: 800 ms
```

**Fast:**
```sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
```

👉 Đọc `rows=` (planner **đoán**) vs `actual rows=` (**thật**). Lệch nhiều = statistics cũ → `ANALYZE`.

### Đo cả CÁI GIÁ
```sql
\timing on
INSERT INTO orders (customer_id, amount_cents, status, note, created_at)
SELECT 1,1,1,'x',now() FROM generate_series(1,100000);
```
Chạy khi có / không có index.

👉 **Index không miễn phí.** Đọc nhanh hơn ~80×, ghi chậm hơn ~30%.

---

## Vòng 2 — N+1 (45 phút)

**Naive:** 20 order, mỗi cái lazy load `customer.name` → **21 query**.
```java
orders.forEach(o -> dto.customerName = o.getCustomer().getName());  // lazy → +1 query
```

**Fast:**
```java
@Query("select o from Order o join fetch o.customer where o.customerId = :cid")
```
Hoặc tốt hơn — DTO projection, không load entity:
```sql
SELECT o.id, c.name, o.amount_cents, o.status, o.created_at
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.customer_id = ?
```

👉 Trên UI: `🔍 21 query` → `🔍 1 query`. Đây là lý do phải đếm query — thời gian
không phải lúc nào cũng lộ ra N+1, nhưng số query thì luôn.

---

## Vòng 3 — Phân trang (45 phút)

**Naive:**
```sql
SELECT * FROM orders ORDER BY id OFFSET 1000000 LIMIT 20;   -- ~2000 ms
```

**Fast — keyset:**
```sql
SELECT * FROM orders WHERE id > :cursor ORDER BY id LIMIT 20;  -- ~10 ms
```

Đo ở **3 vị trí**: trang 1, trang 50.000, trang cuối.

| Trang | OFFSET | Keyset |
|---|---|---|
| 1 | | |
| 50.000 | | |
| cuối | | |

👉 `OFFSET 1000000` buộc Postgres đọc **và bỏ** 1 triệu dòng. Keyset **phẳng** ở mọi trang.
Đây là lý do mọi API thật dùng cursor, không dùng `?page=N`.

---

## Vòng 4 — Payload (30 phút)

**Naive:** `SELECT *` + trả entity đầy đủ → kèm cả cột `note` dài, kèm quan hệ lồng nhau.

**Fast:** DTO chỉ 5 cột cần hiện trên bảng.

👉 Trên UI: `📦 2.1 MB` → `📦 80 KB`. Thời gian server gần như không đổi, nhưng
**thời gian người dùng thấy** giảm rõ — phần lớn chi phí là truyền và parse JSON.

Thử với DevTools → Network throttle **Slow 3G** để thấy khác biệt thật.

---

## Vòng 5 — Connection pool (45 phút) ⭐ phản trực giác

Máy có **12 core**. Thử `pool = 5 / 12 / 20 / 50 / 100`:

```yaml
spring.datasource.hikari.maximum-pool-size: 20
```

Tạo tải đồng thời (không cần cài gì):
```bash
seq 500 | xargs -P 50 -I{} curl -s -o /dev/null \
  -w '%{time_total}\n' 'http://localhost:8080/api/orders?customerId=123' \
  | sort -n | awk '{v[NR]=$1*1000} END {printf "p50=%.0fms p99=%.0fms\n", v[int(NR*.5)], v[int(NR*.99)]}'
```

| pool | p50 | p99 | rps |
|---|---|---|---|
| 5 | | | |
| 12 | | | |
| 20 | | | |
| 50 | | | |
| 100 | | | |

👉 **Throughput đạt đỉnh quanh số core rồi GIẢM.** Postgres song số giới hạn bởi CPU,
không bởi số connection. 100 connection tranh 12 core → mỗi query chậm 8× + chi phí
context switch.

Đây là bài học khó tin nhất: **thêm tài nguyên làm hệ thống chậm đi.**

---

# Bảng kết quả — điền vào đây

| Vòng | Thay đổi | Thời gian | Query | Payload | Nhanh hơn |
|---|---|---|---|---|---|
| 0 | baseline (naive hết) | | | | — |
| 1 | + index | | | | |
| 2 | + sửa N+1 | | | | |
| 3 | + keyset | | | | |
| 4 | + DTO | | | | |
| 5 | + pool tối ưu | | | | |

**Cái giá đã trả:**

| Thay đổi | Cái giá |
|---|---|
| index | INSERT chậm hơn ___% , disk thêm ___MB |
| keyset | không nhảy được tới trang N bất kỳ |
| DTO | thêm code, phải sửa 2 chỗ khi đổi field |

---

## 3 câu phải trả lời được

1. Vì sao **pool lớn hơn lại chậm hơn**?
2. Vì sao `OFFSET 1000000` chậm, mà `WHERE id > 1000000` lại nhanh?
3. Index đổi lấy cái gì? (có số liệu)

Trả lời được 3 câu = bạn đã học phần cốt lõi.

## Nếu còn thời gian

- Bật `shared_buffers` lên 4GB → đo lại vòng 1. Vì sao khác?
- Thêm `EXPLAIN` vào `meta` → hiện plan ngay trên UI
- Partial index `WHERE status = 0` → so size với index đầy đủ
