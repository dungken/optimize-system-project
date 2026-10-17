# Chia việc — TRUNG & DUNG

## Nguyên tắc

**Vòng 0 (dựng khung) → chia RIÊNG, làm song song.** Đó là việc tay, không có bài học.

**Vòng 1-5 (tối ưu) → làm CHUNG, luân phiên người gõ.** Đó là toàn bộ bài học.
Chia riêng 5 vòng = mỗi người chỉ học 1/2.

**Số liệu cuối chỉ lấy từ MỘT máy** (máy DUNG). Trộn số 2 máy → bảng kết quả vô nghĩa.

---

## Vòng 0 — Dựng khung (60 phút, làm song song)

| | DUNG | TRUNG |
|---|---|---|
| Việc | **Backend** | **Frontend** |
| | `seed.sql` — 200k customers + 2M orders | `App.tsx` — bảng + 5 checkbox |
| | `MeasureFilter` — `tookMs` | `MetaBar.tsx` — 3 ô số + **so với lần trước** |
| | `QueryCounter` — `StatementInspector` | `api.ts` — gọi API, đọc `meta` |
| | `OrderController` + API naive | Network throttle Slow 3G (DevTools) |
| Branch | `lab/backend` | `lab/frontend` |

**Chốt trước khi tách ra:** đồng ý hình dạng JSON của `meta` (xem [design.md](design.md#api)).
Không chốt thì ghép vào sẽ sai.

```json
"meta": { "tookMs": 812, "queryCount": 101, "bytes": 2134567, "optsOn": [] }
```

TRUNG mock sẵn file JSON để làm UI trước, không phải chờ backend xong.

Hết 60 phút: merge cả hai vào `lab`, mở trang, thấy `⏱ 812ms 🔍 101 query 📦 2.1MB`.
**Đó là baseline.**

---

## Vòng 1-5 — Làm chung (3,5 tiếng)

Ngồi cùng một máy (máy DUNG). Luân phiên: một người **gõ**, một người **đọc EXPLAIN + ghi số**.

| Vòng | Bài | Người gõ | Người ghi số | Phút |
|---|---|---|---|---|
| 1 | Index + đo cái giá | **TRUNG** | DUNG | 45 |
| 2 | N+1 → JOIN FETCH | **DUNG** | TRUNG | 45 |
| 3 | OFFSET → keyset | **TRUNG** | DUNG | 45 |
| 4 | Entity → DTO | **DUNG** | TRUNG | 30 |
| 5 | Pool sizing ⭐ | **cả hai** | cả hai | 45 |

Vòng 5 làm chung vì nó phản trực giác nhất — phải chạy 5 mức pool, mỗi người tự đoán
trước rồi so với kết quả.

**Người ghi số không phải thư ký.** Việc của họ là:
- đọc `EXPLAIN (ANALYZE, BUFFERS)` ra tiếng, nói `rows=` lệch `actual rows=` bao nhiêu
- điền bảng trong [steps.md](steps.md)
- hỏi "vì sao" khi số không như dự đoán

---

## Trước mỗi vòng: cùng đoán trước

| | Dự đoán của DUNG | Dự đoán của TRUNG | Thực tế |
|---|---|---|---|
| Vòng 1: index nhanh hơn mấy lần? | | | |
| Vòng 2: query từ 21 xuống? | | | |
| Vòng 3: trang cuối từ 2s xuống? | | | |
| Vòng 5: pool tối ưu là? | | | |

Chỗ cả hai đoán sai = chỗ cả hai hiểu sai hệ thống. **Đó là phần giá trị nhất của 5 tiếng.**

---

## TRUNG dùng Windows — cần gì

Lab này **không cần WSL2**. Java, Maven, PostgreSQL, Node đều chạy native trên Windows.

| Cần | Vì sao |
|---|---|
| **Git Bash** | lệnh `psql -f`, `xargs -P` ở vòng 5 |
| Node ≥ 20 | Vite |
| JDK 21 + Maven | backend (nếu muốn chạy thử local) |

Không cần: Docker, WSL2, Redis, k6, Grafana.

**TRUNG tự chạy trên máy mình để học thì tốt**, nhưng số đó **không** điền vào bảng
trong `steps.md` — chỉ số từ máy DUNG.

---

## Git

```
master          ← chỉ docs
  lab           ← nhánh làm việc chung
    lab/backend     ← DUNG, vòng 0
    lab/frontend    ← TRUNG, vòng 0
```

Vòng 1-5 ngồi chung một máy → commit thẳng vào `lab`, không cần branch riêng.

Commit message ghi số:
```
perf(vòng 1): index orders(customer_id) — 812ms → 10ms (81×)
```

Đọc lại `git log` là thấy cả hành trình tối ưu.

---

## Hết 5 tiếng — cùng trả lời

Mỗi người tự viết câu trả lời, rồi so:

1. Vì sao **pool lớn hơn lại chậm hơn**?
2. Vì sao `OFFSET 1000000` chậm mà `WHERE id > 1000000` nhanh?
3. Index đổi lấy cái gì? (có số liệu)
4. Vòng nào cải thiện nhiều nhất? Có đúng như bạn đoán ban đầu?

Trả lời khác nhau = còn chỗ chưa hiểu → nói lại cho nhau nghe. Đó là 20 phút
giá trị nhất của cả buổi.
