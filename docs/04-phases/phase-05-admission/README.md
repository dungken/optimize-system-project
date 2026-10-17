# Phase 5 — Admission Control & Degradation

`1,5 tuần` · bỏ được

## Mục tiêu

Ở tải **10× công suất**: hệ thống **không sập**, error rate có kiểm soát, và người đã vào
vẫn được phục vụ đúng SLO.

## Nguyên tắc

> Hệ thống tốt không phải hệ thống không bao giờ quá tải,
> mà là hệ thống **suy giảm có kiểm soát**.

Sơ đồ phễu 3 tầng: [../../03-diagrams/admission-funnel.md](../../03-diagrams/admission-funnel.md)
Hàng chờ + SSE: [../../03-diagrams/sequence-queue.md](../../03-diagrams/sequence-queue.md)

## Vì sao sau Phase 4

Ngưỡng load shedding tính từ **công suất thật đo được**:

```
ngưỡng = p99 đo ở Phase 4 × 1,5
```

Không biết công suất thật thì ngưỡng là con số đoán — và ngưỡng sai còn tệ hơn không có.

## Bài học kỳ vọng

- **Hàng chờ vô hạn luôn tệ hơn từ chối sớm** — và hiểu vòng xoáy *retry storm*:
  chờ lâu hơn timeout của client → client retry → tải nhân đôi → sập.
- **Backpressure**: tốc độ nhả người phải lấy từ throughput đo được, không hardcode.
- Cho người dùng biết "bạn ở vị trí 12431, còn 3 phút" là tối ưu **hành vi** — hiệu quả
  thường lớn hơn tối ưu code, vì nó dừng được việc F5 liên tục.
- Vì sao **timeout ở mọi call ra ngoài** là bắt buộc: 1 dependency chậm 2s có thể làm chết
  cả API không liên quan.
- Đây là chỗ virtual threads **thực sự thắng**: 50.000 SSE connection.

## Bẫy

| Bẫy | Hậu quả |
|---|---|
| Hardcode tốc độ nhả người | Hệ thống chậm đi mà vẫn nhả đều → sập |
| Không có timeout cho payment | Pool cạn → `GET /events` cũng chết |
| Load shed trước rate limit | Tốn tài nguyên cho request abuse |
| Trả 503 mà không có `Retry-After` | Client retry ngay lập tức → retry storm |
