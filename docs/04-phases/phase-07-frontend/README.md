# Phase 7 — Frontend (React + TypeScript)

`1 tuần` · bỏ được · **độc lập với backend** (làm song song được)

## Mục tiêu

LCP < 2,5s và INP < 200ms **dưới điều kiện throttle** (CPU 4× + Slow 3G), bundle initial
< 200KB gzip.

## Nguyên tắc

> Tối ưu frontend là vấn đề **network và render**, không phải thuật toán JS.

Hầu hết thời gian tải trang là: tải JS → parse JS → chờ API → render. Không phải chạy
vòng lặp. Đây là lý do `useMemo` thường không đổi được gì.

## Phải test dưới throttle

Máy dev 12 core + mạng gigabit cho số liệu vô nghĩa. Người dùng thật dùng điện thoại
tầm trung trên 4G yếu.

```
DevTools → Performance → CPU: 4× slowdown
DevTools → Network    → Slow 3G
```

Số đo trên máy dev **không** được ghi vào báo cáo.

## Bài học kỳ vọng

- `useMemo`/`memo` thường là **premature optimization** — bạn sẽ đo và thấy nó không
  đổi gì trong phần lớn trường hợp
- Nguồn chậm thật: bundle lớn, waterfall request, re-render toàn cây, layout thrashing
- Virtual scrolling là tối ưu **thật** (giảm số DOM node thực sự)
- Optimistic update cải thiện **cảm nhận** mà không đổi latency thật — và cảm nhận là
  cái người dùng trải nghiệm
- Web Vitals phải đo từ **người dùng thật** (RUM), không từ Lighthouse local

## Bẫy

| Bẫy | Hậu quả |
|---|---|
| Đo trên máy dev | Mọi chỉ số đều đẹp, không phản ánh thực tế |
| Bọc `memo` khắp nơi | Thêm chi phí so sánh props, không giảm render |
| Polling 2s cho hàng chờ | 50k user × 30 req/phút = 25.000 rps chỉ để hỏi vị trí |
| Import cả icon set | +300KB bundle cho 5 icon |
