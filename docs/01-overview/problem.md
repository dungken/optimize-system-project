# Bài toán

Bán **1.000 vé** cho **50.000 người** truy cập trong cùng 10 giây.

Tỉ lệ 50:1 là điểm làm bài toán thú vị: **98% request phải bị từ chối**, và từ chối nhanh
mới là thành công. Hệ thống xử lý 1.000 giao dịch nhưng phải chịu 50.000 lượt tấn công vào
đúng một dòng dữ liệu.

## Vì sao chọn đề tài này để học tối ưu

Hầu hết dự án CRUD chỉ cho bạn gặp **một** loại nghẽn: đọc nặng. Flash-sale ép bạn gặp cả ba:

| Loại nghẽn | Biểu hiện ở đây |
|---|---|
| **Tranh chấp ghi** | 50.000 request cùng giảm một bộ đếm tồn |
| **Đọc nóng** | 1 event chiếm 90% lưu lượng đọc catalog |
| **Điều tiết tải** | Nhận hết 50.000 req/s thì sập, phải biết từ chối |

Thêm vào đó là một **invariant cứng** (`oversell == 0`) không được phá dù tối ưu đến đâu —
điều này buộc bạn học cách phân biệt "nhanh" và "đúng".

## SLO đích

| Chỉ số | Baseline (Phase 1) | Đích |
|---|---|---|
| `POST /reservations` p99 | ~10.000 ms | **< 200 ms** |
| Throughput | ~200 rps | **> 5.000 rps** |
| Oversell | ? | **0** |
| Vé rò rỉ (leaked) | ? | **0** |
| Error rate 5xx | > 40% | **< 0.1%** |
| GC pause p99 | — | **< 10 ms** |
| Frontend LCP (Slow 3G) | — | **< 2.5 s** |

## Phạm vi — và những gì CỐ Ý bỏ ra ngoài

**Có:** catalog, giữ chỗ, xác nhận đơn, hàng chờ, payment **mock**.

**Không có:** đăng nhập thật, payment gateway thật, email, admin panel, chọn ghế theo sơ đồ.

Lý do: mỗi tính năng thêm vào làm loãng việc đo. Dự án này đo hiệu năng, không demo sản phẩm.

## Nguyên tắc bất di bất dịch

1. **Không tối ưu trước khi đo được** → mọi thay đổi phải có số before/after.
2. **Một thay đổi một lần** → đổi 3 thứ cùng lúc thì không biết thứ nào có tác dụng.
3. **`oversell == 0` là bất khả xâm phạm** → nhanh mà sai thì vô nghĩa.
4. **Tải nhỏ không có bài học** → data phải lớn hơn mức RAM cache được.
5. **Ghi cả thất bại** → tối ưu không hiệu quả là entry giá trị nhất trong log.
