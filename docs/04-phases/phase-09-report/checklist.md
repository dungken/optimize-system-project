# Phase 9 — Exit checklist

## Phải có

- [ ] `OPTIMIZATION_LOG.md` — mọi entry có bảng số liệu, không có entry nào trống
- [ ] `results/final-report.md` đủ 9 phần
- [ ] Bảng tổng baseline → cuối với % cải thiện
- [ ] Sơ đồ bottleneck dịch chuyển qua các phase
- [ ] **Mục "Những tối ưu KHÔNG hiệu quả" có ít nhất 3 entry**
- [ ] Bảng dự đoán vs thực tế, có cột "tôi đã hiểu sai điều gì"
- [ ] Grafana snapshot before/after
- [ ] Mục giới hạn — nói rõ cái gì **chưa** test
- [ ] `README.md` gốc cập nhật kết quả + link
- [ ] Docs không còn chỗ nào lệch với code thật

## Bảng tổng kết

| Chỉ số | Baseline (P1) | Cuối (P8) | Cải thiện |
|---|---|---|---|
| p99 `POST /reservations` | | | ×? |
| p99 `GET /events` | | | ×? |
| Throughput | | | ×? |
| Error rate | | | |
| DB QPS | | | |
| Oversell | | **0** | — |
| Vé rò rỉ | | **0** | — |
| GC pause p99 | | | |
| LCP (throttle) | | | |
| Bundle gzip | | | |

## Đóng góp từng phase

| Phase | p99 trước | p99 sau | Đóng góp % |
|---|---|---|---|
| 2 Database | | | |
| 3 Concurrency | | | |
| 4 Cache | | | |
| 5 Admission | | | |
| 6 JVM | | | |

Cột cuối trả lời: phase nào đáng công nhất? Có khớp với kỳ vọng ban đầu (Phase 2 và 3)?

## Những tối ưu KHÔNG hiệu quả

| Thay đổi | Kỳ vọng | Thực tế | Vì sao tôi đoán sai |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

Tối thiểu 3 dòng. Nếu không có dòng nào thì một trong hai: bạn chưa thử gì mạo hiểm,
hoặc bạn chưa đo đủ cẩn thận để phát hiện.

## Bài kiểm tra cuối

Đưa `final-report.md` cho một người không theo dự án. Họ phải trả lời được:

1. Hệ thống làm gì?
2. Vấn đề ban đầu là gì?
3. Thay đổi nào quan trọng nhất?
4. Tác giả đã sai ở đâu, và phát hiện ra bằng cách nào?

Không trả lời được câu 4 → báo cáo chưa trung thực đủ.
