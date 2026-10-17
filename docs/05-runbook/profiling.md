# Profiling

## async-profiler

```bash
scripts/profile.sh <pid> cpu    30     # CPU, 30 giây
scripts/profile.sh <pid> alloc  30     # allocation ← Phase 6 cần cái này
scripts/profile.sh <pid> lock   30     # lock contention ← Phase 3
scripts/profile.sh <pid> wall   30     # wall clock, thấy cả thời gian chờ
```

Xuất HTML, mở bằng browser.

### Chọn mode nào

| Câu hỏi | Mode |
|---|---|
| CPU đang cháy ở đâu? | `cpu` |
| Rác đến từ đâu? | `alloc` |
| Thread đang chờ lock nào? | `lock` |
| Request chậm mà CPU thấp — chờ gì? | `wall` |

`wall` là mode hay bị bỏ qua: nó cho thấy thời gian **chờ** (IO, lock, sleep) mà `cpu`
không thấy. Ở Phase 1-3 nghẽn là chờ lock → `wall` mới đúng, `cpu` sẽ trông như "chẳng làm gì".

### Đọc flame graph

- **Rộng = tốn nhiều.** Sâu = stack dài, không liên quan chi phí.
- Đọc từ dưới lên: dưới là caller, trên là callee.
- Tìm cột rộng nhất ở gần đỉnh → đó là nơi thời gian thực sự đi.
- So sánh before/after: mở 2 file cạnh nhau, tìm cột đã hẹp lại.

## JDK Flight Recorder

```bash
java -XX:StartFlightRecording=duration=60s,filename=results/app.jfr \
     -XX:FlightRecorderOptions=stackdepth=128 \
     -jar backend/target/app.jar
```

Mở bằng JDK Mission Control. Dùng cho:

| Event | Trả lời |
|---|---|
| `jdk.JavaMonitorEnter` | thread chờ lock nào, bao lâu |
| `jdk.SocketRead` / `SocketWrite` | IO wait thật |
| `jdk.ObjectAllocationSample` | allocation theo type |
| `jdk.GCPhasePause` | GC pause chi tiết từng phase |

JFR nhẹ hơn async-profiler (~1% overhead) nên bật được ở profile `bench` thường xuyên.

## Virtual thread pinning

```bash
java -Djdk.tracePinnedThreads=full -jar app.jar
```

In stack trace mỗi khi virtual thread bị ghim. Nguyên nhân thường gặp:
`synchronized` block quanh IO → thay bằng `ReentrantLock`.

Im lặng = không có pinning.

## ⚠️ Warm-up

```
Luôn chạy tải 2 phút TRƯỚC khi lấy số liệu.
```

JIT chưa compile thì bạn đang đo interpreter, không đo code thật. Đây là nguyên nhân phổ
biến nhất của số liệu không lặp lại được giữa các lần chạy.

Áp dụng cho **mọi** phase, bắt buộc ở Phase 6.

## Overhead của chính công cụ đo

| Công cụ | Overhead |
|---|---|
| Micrometer + Prometheus scrape 15s | < 1% |
| OTel agent, sampling 1% | ~1-2% |
| OTel agent, sampling 100% | **5-15%** ← hạ xuống khi chạy spike |
| async-profiler cpu | ~2% |
| async-profiler alloc | ~5-10% |
| JFR mặc định | ~1% |

Ghi lại overhead trong `results/` — nếu không, bạn sẽ có lúc tối ưu chính công cụ đo
mà tưởng là tối ưu hệ thống.
