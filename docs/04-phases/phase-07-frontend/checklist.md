# Phase 7 — Exit checklist

## Phải đạt — mọi số đo DƯỚI THROTTLE (CPU 4× + Slow 3G)

- [ ] LCP < **2,5s**
- [ ] INP < **200ms**
- [ ] CLS < **0,1**
- [ ] Bundle initial < **200KB gzip**
- [ ] Web Vitals từ người dùng thật đổ về Grafana (không chỉ Lighthouse local)
- [ ] Virtual scrolling hoạt động, số DOM node không tăng theo số item
- [ ] Optimistic update cho nút giữ chỗ, rollback đúng khi lỗi
- [ ] Client tôn trọng `Retry-After` của 429/503
- [ ] Client tự sinh `Idempotency-Key` cho mọi POST
- [ ] SSE vs polling đã đo, có lựa chọn + lý do

## Số liệu phải ghi

| Chỉ số | Baseline | Sau P7 | Δ |
|---|---|---|---|
| LCP (throttle) | | | |
| INP (throttle) | | | |
| CLS | | | |
| Bundle initial (gzip) | | | |
| Bundle tổng | | | |
| Số request khi load trang | | | |
| Time to Interactive | | | |
| DOM node (list 1.000 vé) | | | |

### `memo` có tác dụng thật không

| Component | Render/giây trước | Sau `memo` | INP đổi? | Giữ lại? |
|---|---|---|---|---|
| | | | | |

Cột cuối là bài học: nếu `memo` không đổi INP thì **bỏ nó đi** — nó chỉ thêm phức tạp.

### SSE vs polling

| | Polling 2s | SSE |
|---|---|---|
| Request/phút/user | | |
| Băng thông ước tính 50k user | | |
| Connection giữ | | |
| Độ trễ cập nhật | | |

## Câu hỏi phải trả lời được

1. Thay đổi nào cải thiện LCP nhiều nhất? (dự đoán: loại dep nặng, không phải `memo`)
2. `memo`/`useMemo` có đổi được INP không? Số liệu?
3. Virtual scrolling giảm DOM node bao nhiêu? INP đổi bao nhiêu?
4. SSE hay polling cho hàng chờ? Đánh đổi gì?
5. Số đo trên máy dev chênh số đo dưới throttle bao nhiêu lần?
