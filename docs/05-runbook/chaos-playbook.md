# Chaos playbook (native)

Mục đích: chứng minh `oversell == 0` **kể cả khi có sự cố**, không chỉ ở happy path.

## ⚠️ Luật số một

```bash
scripts/chaos/reset.sh      # chạy SAU MỖI test, không ngoại lệ
tc qdisc show dev lo        # xác nhận sạch
```

`tc` rule tồn tại **đến khi reboot**. Quên xoá → mọi số đo sau đó sai mà bạn không hiểu
vì sao, và có thể mất cả ngày debug một vấn đề không tồn tại.

## Bộ lệnh

| Tình huống | Lệnh | Hoàn tác |
|---|---|---|
| Redis chết | `sudo systemctl stop redis-server` | `start` |
| PG chết | `sudo systemctl stop postgresql` | `start` |
| Mạng chậm 200ms | `sudo tc qdisc add dev lo root netem delay 200ms` | `sudo tc qdisc del dev lo root` |
| Jitter | `sudo tc qdisc add dev lo root netem delay 100ms 50ms` | như trên |
| Mất 5% packet | `sudo tc qdisc add dev lo root netem loss 5%` | như trên |
| App treo | `kill -STOP <pid>` | `kill -CONT <pid>` |
| App chết hẳn | `kill -9 <pid>` | chạy lại |
| CPU 50% | `systemd-run --scope -p CPUQuota=50% java -jar app.jar` | kết thúc process |
| RAM 512MB | `systemd-run --scope -p MemoryMax=512M java -jar app.jar` | kết thúc process |
| Disk đầy | `fallocate -l 10G /tmp/filler` | `rm /tmp/filler` |

## Kịch bản bắt buộc (Phase 3)

| # | Kịch bản | Phải chứng minh |
|---|---|---|
| 1 | Kill Redis giữa `spike.js` | `oversell == 0`, fallback sang DB hoạt động |
| 2 | Redis restart mất hết key | warm lại đúng, không oversell |
| 3 | `kill -STOP` app 10s rồi `-CONT` | request đang bay không tạo vé trùng |
| 4 | DB chậm 200ms | timeout bắt được, không pool cạn |
| 5 | Listener chết, chỉ job quét chạy | vé vẫn được trả, `leaked == 0` |
| 6 | Cả listener và job cùng trả 1 vé | `SETNX` chặn, `stock` không phình |

## Kịch bản cluster (Phase 8)

| # | Kịch bản | Phải chứng minh |
|---|---|---|
| 7 | Kill 1/4 instance | nginx loại khỏi upstream, request không lỗi |
| 8 | Redis chết với 4 instance | cả 4 fallback, không instance nào oversell |
| 9 | `MemoryMax=512M` | OOM có kiểm soát, không corrupt data |
| 10 | Kafka chết 5 phút | API chuyển ghi đồng bộ, consumer lag catch up sau |

## Mẫu ghi kết quả

```markdown
### Chaos #1 — Kill Redis giữa spike

Thời điểm: t=45s của spike.js (50k VU)
Lệnh: sudo systemctl stop redis-server

| Quan sát | Kết quả |
|---|---|
| oversell | 0 ✅ |
| leaked | 0 ✅ |
| error rate trong 10s sau | 34% (503, đúng như thiết kế) |
| thời gian fallback kích hoạt | 1,2s |
| p99 sau fallback | 890ms (degrade có kiểm soát) |
| sau khi Redis lên, drift | 142 → 0 sau 60s ✅ |

Kết luận: ...
```
