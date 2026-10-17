# Optimization Log

> Mỗi thay đổi tối ưu = một entry. Không có số liệu thì không được tính là một entry.
> Ghi cả những lần **không** hiệu quả — đó là phần giá trị nhất.

## Bảng tổng (cập nhật dần)

| Phase | Thay đổi | p99 | Throughput | Error rate | Kết luận |
|---|---|---|---|---|---|
| 1 | Baseline (naive) | — | — | — | mốc so sánh |

---

## Template (copy xuống dưới cho mỗi entry)

```markdown
## [YYYY-MM-DD] Phase N — <Tên thay đổi>

**Giả thuyết**
Tôi nghĩ <X> là bottleneck vì <bằng chứng cụ thể: metric nào, flame graph nào, EXPLAIN nào>.

**Thay đổi**
<mô tả ngắn> — commit: `abc1234`

**Điều kiện đo**
- Script: `load-test/spike.js`, 50k VU trong 10s
- Dữ liệu: 10M users / 50M orders
- Hạ tầng: 1 instance, pool=20, heap=2G

**Số liệu**
| Chỉ số | Before | After | Δ |
|---|---|---|---|
| p50 (ms) | | | |
| p95 (ms) | | | |
| p99 (ms) | | | |
| throughput (req/s) | | | |
| error rate (%) | | | |
| DB QPS | | | |
| oversell | 0 | 0 | phải luôn là 0 |

**Kết quả**: ✅ đúng như giả thuyết / ❌ sai / ⚠️ đúng một phần

**Bài học**
<điều bạn KHÔNG biết trước khi đo. Nếu không có gì mới thì entry này chưa xong.>

**Bottleneck tiếp theo**
<sau thay đổi này, nghẽn đã dịch sang đâu?>
```

---

## Những tối ưu KHÔNG hiệu quả

| Thay đổi | Kỳ vọng | Thực tế | Vì sao |
|---|---|---|---|
| | | | |

---

# Entries

<!-- entry mới nhất ở trên cùng -->
