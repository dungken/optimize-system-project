# Thiết kế

## Schema

```sql
CREATE TABLE customers (
  id   bigserial PRIMARY KEY,
  name text NOT NULL,
  city text NOT NULL
);

CREATE TABLE orders (
  id           bigserial PRIMARY KEY,
  customer_id  bigint      NOT NULL REFERENCES customers(id),
  amount_cents bigint      NOT NULL,
  status       smallint    NOT NULL,     -- 0 PENDING 1 PAID 2 CANCELLED
  note         text,                     -- cột NẶNG, cố ý: để thấy payload khác biệt
  created_at   timestamptz NOT NULL
);
```

| Bảng | Số dòng | Vì sao |
|---|---|---|
| `customers` | 200.000 | để tạo N+1 (mỗi order cần tên khách) |
| `orders` | 2.000.000 | đủ lớn để seq scan chậm rõ rệt |

`note` là cột text dài — cố ý có để công tắc `payload` thấy được khác biệt.

**Không index nào ngoài PK.** Bài 1 sẽ thêm.

## API

```
GET /api/orders?customerId=123&page=0&size=20&cursor=&opt=index,n1,page
```

| Tham số | Nghĩa |
|---|---|
| `customerId` | lọc theo khách (dùng ở công tắc `index`) |
| `page` / `size` | phân trang OFFSET (naive) |
| `cursor` | phân trang keyset (fast) |
| `opt` | **danh sách công tắc đang BẬT**, phân cách bằng dấu phẩy |

`opt` rỗng = toàn bộ naive. `opt=index,n1,page,payload` = tối ưu hết.

### Response

```json
{
  "items": [
    { "id": 1, "customerName": "Nguyen A", "amountCents": 125000,
      "status": "PAID", "createdAt": "2026-03-01T10:00:00Z" }
  ],
  "nextCursor": "1000020",
  "meta": { "tookMs": 812, "queryCount": 101, "bytes": 2134567, "optsOn": [] }
}
```

`meta` là thứ hiện lên UI. Đây là điểm cốt lõi của cả dự án: **số liệu nằm trong response,
không phải trong log hay dashboard**.

## Cách đo

### Thời gian

Một `OncePerRequestFilter`:
```
t0 = System.nanoTime()  →  chain.doFilter()  →  tookMs = (nanoTime()-t0)/1e6
```

### Số query

`ThreadLocal<AtomicInteger>` + Hibernate `StatementInspector`:
```java
public String inspect(String sql) { QueryCounter.increment(); return sql; }
```

Reset đầu mỗi request trong filter. Đây là cách duy nhất thấy được N+1 **bằng con số**.

### Kích thước payload

Đếm byte ở `ContentCachingResponseWrapper`, hoặc đọc `Content-Length` ở frontend.

## UI

Một trang duy nhất:

```
┌──────────────────────────────────────────────────────────┐
│  ⏱ 812 ms     🔍 101 query     📦 2.1 MB                 │  ← meta, đổi màu theo ngưỡng
├──────────────────────────────────────────────────────────┤
│  ☐ index   ☐ n1   ☐ page   ☐ payload   ☐ pool            │  ← 5 checkbox
│  customerId [123]   trang [1] [50000] [cuối]             │
├──────────────────────────────────────────────────────────┤
│  id    khách         số tiền      trạng thái    ngày     │
│  ...                                                      │
└──────────────────────────────────────────────────────────┘
```

**Yêu cầu quan trọng:** khi bấm checkbox, giữ lại số của lần gọi **trước** để so sánh
cạnh nhau:

```
⏱ 10 ms  (trước: 812 ms — nhanh hơn 81×)
```

Không có phần so sánh này thì bạn phải tự nhớ số cũ, và sẽ không nhớ.

## Cấu trúc file

```
backend/
├── pom.xml
├── seed.sql                        # generate_series, KHÔNG qua JPA
└── src/main/java/com/lab/
    ├── LabApplication.java
    ├── measure/
    │   ├── MeasureFilter.java      # tookMs + reset counter
    │   └── QueryCounter.java       # ThreadLocal + StatementInspector
    ├── order/
    │   ├── OrderController.java
    │   ├── OrderService.java       # đọc opt, chọn naive hay fast
    │   ├── OrderRepository.java    # naive: JPA lazy
    │   ├── OrderFastDao.java       # fast: native query + DTO
    │   ├── Order.java  Customer.java
    │   └── dto/
    └── resources/application.yml

frontend/
└── src/
    ├── App.tsx                     # cả trang nằm ở đây, đừng chia nhỏ
    ├── MetaBar.tsx                 # 3 ô số + so sánh với lần trước
    └── api.ts
```

Chỉ vậy. Không chia layer sâu, không abstraction. Dự án 5 tiếng.
