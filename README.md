# Flash-Sale Ticket Booking — dự án học tối ưu hệ thống

Bán **1.000 vé** cho **50.000 người** cùng lúc. Java 21 + Spring Boot 3 + React TS.
Chạy **native, không Docker**.

👉 Toàn bộ thiết kế và lộ trình: **[ROADMAP.md](ROADMAP.md)**
👉 Nhật ký đo lường (sản phẩm chính): **[OPTIMIZATION_LOG.md](OPTIMIZATION_LOG.md)**

## Nguyên tắc
Không tối ưu trước khi đo được. Mọi thay đổi phải có số before/after.
`oversell == 0` là bất khả xâm phạm.

## Trạng thái
- [x] Thiết kế (HLD + LLD)
- [x] Cây thư mục
- [ ] Phase 0 — hạ tầng đo lường
- [ ] Phase 1 — baseline

## Chạy (sẽ có sau Phase 0)
```bash
make stack-up      # prometheus + grafana + jaeger
make seed          # dữ liệu test
make run           # app :8080
make bench         # k6 -> results/
```

## Đã có trên máy dev
Java 21 · Maven 3.8 · PostgreSQL 16 (:5432) · Redis 7 (:6379) · Node 18
