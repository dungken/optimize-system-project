# Phase 1 — Bản ngây thơ + Baseline

`3-4 ngày` · **không bỏ được**

## Mục tiêu

Viết bản **tệ nhất có thể**, đo nó, và **không sửa gì**.

## Vì sao cố tình viết tệ

Baseline là mốc so sánh cho toàn bộ 8 phase còn lại. Không có nó thì câu "p99 giảm 50×"
là vô nghĩa — giảm so với cái gì?

Cảm giác **biết chỗ nào sai mà không được sửa** là phần của bài học. Nó dạy bạn kỷ luật
đo trước khi tối ưu — thứ khó nhất trong nghề này.

## Những gì CỐ Ý làm sai

| Quyết định sai | Sẽ sửa ở phase |
|---|---|
| `SELECT ... FOR UPDATE` trên row inventory | 3 |
| Không index nào ngoài PK | 2 |
| Trả full JPA entity trong response | 2 |
| `OFFSET` pagination | 2 |
| Không cache | 4 |
| Lazy loading gây N+1 | 2 |
| Pool size mặc định (10) | 2 |
| Ghi đồng bộ trong transaction | 5 |

## Dữ liệu

| Bảng | Số dòng |
|---|---|
| `users` | 2M |
| `events` | 1.000 |
| `ticket_types` | 4.000 |
| `inventory` | 4.000 (**1 row là hot row**) |
| `orders` | 5M |
| `reservations` | 5M |

Thấp hơn lý tưởng (10M/50M) do disk còn 12GB. Bù lại bằng `shared_buffers = 256MB` →
data vẫn lớn hơn cache ~8× nên seq scan vs index scan vẫn khác biệt rõ.

Chi tiết: [../../02-design/capacity.md](../../02-design/capacity.md)

**Seed bằng `generate_series` trong SQL thuần, KHÔNG qua JPA.** Seed 5M dòng qua JPA mất
nhiều giờ; SQL thuần mất vài phút.

## Số liệu dự kiến

| Chỉ số | Dự đoán |
|---|---|
| p99 `POST /reservations` | > 10.000 ms |
| Throughput | ~200 rps rồi sập |
| Error rate | > 40% (timeout + deadlock) |
| `hikaricp_connections_pending` | hàng nghìn |
| Deadlock | > 0 |
| Oversell | **có thể > 0** nếu lock sai |

Nếu oversell > 0 ở phase này: **đừng sửa**, ghi lại. Đó là dữ liệu quý — nó chứng minh
vì sao cần CHECK constraint.

## Bài học kỳ vọng

- Đọc flame graph, phân biệt nghẽn **CPU-bound / IO-bound / lock-bound**
- Nhìn Grafana biết *nơi* nghẽn trước khi biết *tại sao*
- Thấy bằng mắt một hệ thống sập dưới tải thật
