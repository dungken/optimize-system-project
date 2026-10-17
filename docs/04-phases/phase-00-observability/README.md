# Phase 0 — Hạ tầng đo lường

`1 tuần` · **không bỏ được**

## Mục tiêu

Một lệnh → sinh tải → nhìn Grafana thấy p50/p95/p99, error rate, pool, GC.

## Vì sao làm trước khi viết business logic

Nếu viết API trước, bạn sẽ "cảm thấy" nó chậm và bắt đầu sửa theo cảm giác. Mọi thay đổi
sau đó không có mốc so sánh. Dự án biến thành chuỗi phỏng đoán.

Phase này không tạo ra tính năng nào. Nó tạo ra **khả năng biết mình đang làm gì**.

## Đã có trên máy dev

| Có sẵn | Phiên bản |
|---|---|
| Java | 21.0.12 |
| Maven | 3.8.7 |
| PostgreSQL | 16.15, `:5432` đang chạy |
| Redis | 7.0.15, `:6379` đang chạy |
| Node | 18.19 (cần ≥20 trước Phase 7) |

## Cần thêm

k6 · Prometheus · Grafana · Jaeger · async-profiler · OTel java agent

Tất cả là binary độc lập → `tools/`, không cần root, xoá là sạch máy.
Chi tiết: [../../05-runbook/setup-native.md](../../05-runbook/setup-native.md)

## Bài học kỳ vọng

- Vì sao **p99 quan trọng hơn mean** — mean che mất đuôi, và đuôi là nơi người dùng bỏ đi.
- Vì sao phải dùng **histogram, không phải summary** — percentile của summary không cộng
  được giữa các instance. `avg(p99)` là con số vô nghĩa.
- **Tail latency amplification** — một request gọi 10 service p99=100ms cho p99 tổng tệ
  hơn 100ms rất nhiều.
- Cách đọc **flame graph**: rộng = tốn nhiều, không phải sâu = tốn nhiều.

## Bẫy

| Bẫy | Hậu quả |
|---|---|
| Dùng summary thay histogram | Phase 8 không tính được p99 toàn hệ thống, phải làm lại |
| Để Prometheus scrape 1s | Prometheus thành bottleneck, đo nhầm overhead của chính nó |
| Sampling trace 100% ở spike test | Jaeger nghẽn, p99 bị nhiễu |
| Tạo dashboard bằng tay trên UI | Không nằm trong git → mất khi Grafana restart |
