# Chia việc xen kẽ — TRUNG & DUNG

## Nguyên tắc

**Xen kẽ:** không ai "chuyên" backend hay frontend. Mỗi người làm cả hai, đổi vai giữa buổi.

**Cái giá của xen kẽ:** bạn phải đọc code người kia viết. Luật bù lại:
> Nhận task tiếp nối → **đọc code người trước 2 phút** rồi mới gõ. Không đọc thì sẽ viết trùng.

**Số liệu cuối chỉ lấy từ MỘT máy** (máy DUNG). Trộn số 2 máy → bảng kết quả vô nghĩa.

Tổng ~5,25 tiếng.

---

# VÒNG 0 — Dựng khung (85 phút)

## Khối A — song song, 30 phút

Chốt trước khi tách: **hình dạng `meta`**. Không chốt thì ghép vào sẽ sai.
```json
"meta": { "tookMs": 812, "queryCount": 101, "bytes": 2134567, "optsOn": [] }
```

| ID | Task | Ai | Phút | Cần | File |
|---|---|---|---|---|---|
| 0.1 | `pom.xml` + `LabApplication` + `application.yml` | DUNG | 10 | — | `backend/` |
| 0.2 | `meta.mock.json` + `api.ts` đọc mock | TRUNG | 10 | — | `frontend/src/` |
| 0.3 | `seed.sql` — 200k customers + 2M orders (`generate_series`) | DUNG | 20 | 0.1 | `backend/seed.sql` |
| 0.4 | `MetaBar.tsx` — 3 ô số + **so với lần trước** | TRUNG | 20 | 0.2 | `frontend/src/` |

TRUNG làm UI trên mock → không phải chờ backend.

## 🔄 ĐỔI VAI — 30 phút

DUNG sang frontend, TRUNG sang backend. Mỗi người **tiếp nối** code người kia.

| ID | Task | Ai | Phút | Cần | File |
|---|---|---|---|---|---|
| 0.5 | `App.tsx` — bảng đơn + 5 checkbox, gắn vào `MetaBar` của TRUNG | **DUNG** | 20 | 0.4 | `frontend/src/` |
| 0.6 | Entity `Order` + `Customer` + `OrderRepository` | **TRUNG** | 15 | 0.1 | `backend/.../order/` |
| 0.7 | `QueryCounter` — `ThreadLocal` + `StatementInspector` | **TRUNG** | 15 | 0.6 | `backend/.../measure/` |
| 0.8 | Bảng **dự đoán** (xem cuối file) — tự điền, chưa xem đáp án | DUNG | 10 | — | `docs/steps.md` |

## Khối C — cùng nhau, 25 phút

| ID | Task | Ai | Phút | Cần |
|---|---|---|---|---|
| 0.9 | `MeasureFilter` — `tookMs` + reset counter mỗi request | DUNG gõ, TRUNG đọc | 15 | 0.7 |
| 0.10 | `OrderController` naive + ghép FE↔BE thật, bỏ mock | cả hai | 10 | 0.3, 0.5, 0.9 |

✅ **Hết vòng 0:** mở trang, thấy `⏱ 812ms  🔍 101 query  📦 2.1MB`. Đó là **baseline**.

---

# VÒNG 1 — Index (45 phút)

| ID | Task | Ai | Phút |
|---|---|---|---|
| 1.1 | `EXPLAIN (ANALYZE, BUFFERS)` query naive — đọc to `rows=` vs `actual rows=` | **TRUNG** gõ, DUNG đọc | 10 |
| 1.2 | Bấm UI, ghi baseline vào bảng | DUNG | 5 |
| 1.3 | `CREATE INDEX idx_orders_customer` + nhánh `opt=index` ở service | **TRUNG** | 10 |
| 1.4 | Đo lại, tính "nhanh hơn ___ lần" | DUNG | 5 |
| 1.5 | **Đo CÁI GIÁ**: `INSERT` 100k dòng, có vs không index | **DUNG** gõ, TRUNG ghi | 15 |

👉 Index đọc nhanh hơn ~80×, ghi chậm hơn ~30%. Không đo 1.5 thì chỉ học một nửa.

---

# VÒNG 2 — N+1 (45 phút)

| ID | Task | Ai | Phút |
|---|---|---|---|
| 2.1 | Bật `show-sql`, chứng minh 20 order = **21 query** | **DUNG** | 10 |
| 2.2 | Cách 1: `@Query("... join fetch o.customer")` + nhánh `opt=n1` | **DUNG** | 15 |
| 2.3 | Đo, ghi số | TRUNG | 5 |
| 2.4 | Cách 2: DTO projection bằng native query (không load entity) | **TRUNG** | 15 |
| 2.5 | So 2 cách — nhanh hơn? dễ bảo trì hơn? chọn cái nào, vì sao | cả hai | 5 |

👉 Trên UI: `🔍 21 → 1`. Thời gian không luôn lộ ra N+1, **số query thì luôn**.

---

# VÒNG 3 — Phân trang (45 phút)

| ID | Task | Ai | Phút |
|---|---|---|---|
| 3.1 | Đo `OFFSET` ở **3 vị trí**: trang 1 / 50.000 / cuối | **TRUNG** | 10 |
| 3.2 | `OrderFastDao` keyset `WHERE id > :cursor` + trả `nextCursor` | **TRUNG** | 15 |
| 3.3 | FE: nút "trang sau" dùng `cursor` thay `page` | **DUNG** | 10 |
| 3.4 | Đo lại 3 vị trí, điền bảng, nhận xét hình dạng | **DUNG** | 10 |

| Trang | OFFSET | Keyset |
|---|---|---|
| 1 | | |
| 50.000 | | |
| cuối | | |

👉 OFFSET tăng tuyến tính theo số trang. Keyset **phẳng**. Đó là lý do API thật dùng cursor.

---

# VÒNG 4 — Payload (30 phút)

| ID | Task | Ai | Phút |
|---|---|---|---|
| 4.1 | Đếm `bytes` response hiện tại (entity đầy đủ, có cột `note`) | **DUNG** | 5 |
| 4.2 | DTO 5 cột + nhánh `opt=payload` | **DUNG** | 10 |
| 4.3 | FE: hiện `bytes` + test **DevTools → Slow 3G** | **TRUNG** | 10 |
| 4.4 | Ghi số. So **thời gian server** vs **thời gian người dùng thấy** | **TRUNG** | 5 |

👉 `📦 2.1MB → 80KB`. Server-time gần như không đổi, nhưng user-time giảm rõ ở 3G.
Bài học: không phải mọi tối ưu đều nằm ở server.

---

# VÒNG 5 — Connection pool (45 phút) ⭐

| ID | Task | Ai | Phút |
|---|---|---|---|
| 5.1 | **Mỗi người tự viết** pool tối ưu là bao nhiêu — chưa chạy, chưa nhìn nhau | cả hai, riêng | 5 |
| 5.2 | Script tải đồng thời bằng `xargs -P` (Git Bash cũng chạy được) | **TRUNG** | 10 |
| 5.3 | Chạy `pool = 5 / 12 / 20 / 50 / 100` | **DUNG** gõ, TRUNG ghi | 20 |
| 5.4 | Vẽ đồ thị tay, so với dự đoán 5.1 | cả hai | 10 |

| pool | p50 | p99 | rps |
|---|---|---|---|
| 5 | | | |
| 12 | | | |
| 20 | | | |
| 50 | | | |
| 100 | | | |

👉 Máy có **12 core**. Throughput đạt đỉnh quanh đó rồi **GIẢM**.
Bài học khó tin nhất: **thêm tài nguyên làm hệ thống chậm đi.**

---

# KẾT — 20 phút

| ID | Task | Ai |
|---|---|---|
| 6.1 | Mỗi người **tự viết** câu trả lời 4 câu dưới, không nhìn nhau | riêng |
| 6.2 | So câu trả lời. Khác nhau ở đâu → giải thích cho nhau | cả hai |

1. Vì sao pool lớn hơn lại **chậm hơn**?
2. Vì sao `OFFSET 1000000` chậm mà `WHERE id > 1000000` nhanh?
3. Index đổi lấy cái gì? (có số liệu)
4. Vòng nào cải thiện nhiều nhất? Có đúng như bạn đoán ở 0.8 / 5.1?

Chỗ hai người trả lời khác nhau = chỗ còn chưa hiểu. **20 phút này giá trị nhất cả buổi.**

---

# Bảng dự đoán (task 0.8 — điền TRƯỚC khi bắt đầu vòng 1)

| | DUNG đoán | TRUNG đoán | Thực tế |
|---|---|---|---|
| V1: index nhanh hơn mấy lần? | | | |
| V1: INSERT chậm đi mấy %? | | | |
| V2: query từ 21 xuống mấy? | | | |
| V3: trang cuối từ 2s xuống? | | | |
| V4: payload từ 2.1MB xuống? | | | |
| V5: pool tối ưu? | | | |

Chỗ **cả hai** đoán sai = chỗ cả hai hiểu sai hệ thống.

---

# Tổng số phút mỗi người

| | DUNG | TRUNG |
|---|---|---|
| Gõ code | 150 | 145 |
| Đọc / ghi số | 55 | 60 |
| Cùng nhau | 60 | 60 |

Cân bằng có chủ ý: cả hai đều gõ cả backend và frontend, đều có lượt đọc EXPLAIN.

---

# TRUNG dùng Windows

Lab này **không cần WSL2**. Java, Maven, PostgreSQL, Node chạy native.

| Cần | Dùng ở |
|---|---|
| **Git Bash** | `psql -f`, `xargs -P` (task 5.2) |
| Node ≥ 20 | Vite |
| JDK 21 + Maven | backend |

Không cần: Docker, WSL2, Redis, k6, Grafana.

# Git

```
master              ← chỉ docs
  lab               ← nhánh làm việc (vòng 1-5 commit thẳng vào đây)
    lab/backend     ← DUNG, khối A vòng 0
    lab/frontend    ← TRUNG, khối A vòng 0
```

Từ 🔄 ĐỔI VAI trở đi: ngồi chung một máy → một branch `lab`, không conflict.

Commit message ghi số:
```
perf(v1): index orders(customer_id) — 812ms → 10ms (81x)
```
