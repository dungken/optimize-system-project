# Trang danh sách đơn hàng chậm

Một API, một trang web, một công tắc.

Bảng `orders` có **2 triệu dòng**. Trang web hiện danh sách đơn. Ngay trên đầu trang có
**thời gian response** và **số query DB**. Có công tắc đổi giữa hai cách viết cùng một API.

Bấm qua lại công tắc → thấy bằng mắt **800ms ↔ 10ms** trên cùng dữ liệu, cùng màn hình.

## 5 công tắc = 5 bài học

| Công tắc | Naive | Fast | Thấy gì trên UI |
|---|---|---|---|
| `index` | không index | có index | 800ms → 10ms |
| `n1` | lazy load | `JOIN FETCH` | số query 101 → 1 |
| `page` | `OFFSET 1000000` | keyset cursor | trang cuối 2s → 10ms |
| `payload` | `SELECT *` + entity | DTO chỉ cột cần | 2MB → 80KB |
| `pool` | pool=100 | pool=20 | rps cao hơn khi tải nặng |

Mỗi công tắc độc lập. Bật/tắt từng cái để biết **cái nào đóng góp bao nhiêu**.

## Tài liệu

| File | Nội dung |
|---|---|
| [design.md](design.md) | Schema, API, UI, cách đo |
| [steps.md](steps.md) | 5 vòng làm — code naive vs fast, bảng điền số |
| [teamwork.md](teamwork.md) | Chia việc TRUNG & DUNG — cái gì riêng, cái gì chung |

## Stack

Spring Boot 3 + React + TypeScript + PostgreSQL 16.
**Không** Redis, Kafka, Docker, Grafana, k6.

## Chạy

```bash
# 1. tạo DB (cần sudo một lần)
sudo -u postgres psql -c "CREATE USER $USER SUPERUSER;" -c "CREATE DATABASE lab OWNER $USER;"

# 2. seed 2M dòng (~2 phút)
psql lab -f backend/seed.sql

# 3. backend
cd backend && mvn spring-boot:run

# 4. frontend
cd frontend && pnpm i && pnpm dev     # http://localhost:5173
```

## Thời gian

~5 tiếng. Nguyên tắc duy nhất: **đo trước, sửa sau, đo lại**.
Không có số before/after thì không gọi là tối ưu, chỉ là đổi code.
