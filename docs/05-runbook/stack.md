# Bật / tắt stack

## Lệnh thường dùng

```bash
make stack-up        # prometheus + grafana + jaeger
make stack-status    # cái nào đang chạy
make stack-down      # tắt sạch

make seed            # nạp dữ liệu test
make migrate         # flyway migrate
make run             # app :8080
make run-cluster     # 4 instance 8080-8083 (Phase 8)
make bench           # k6 -> results/
make profile PID=... # async-profiler -> flame graph HTML
```

## Thứ tự bật

```
1. systemctl status postgresql redis-server    # phải đang chạy
2. make stack-up                               # observability
3. make migrate && make seed                   # lần đầu
4. make run
5. mở localhost:3000 (Grafana) — dashboard business.json TRƯỚC
6. make bench
```

## Kiểm tra sức khoẻ

| Kiểm | Lệnh / URL |
|---|---|
| App sống | `curl localhost:8080/actuator/health` |
| Metric có xuất | `curl localhost:8080/actuator/prometheus \| grep reservation` |
| Prometheus thấy app | `localhost:9090/targets` → UP |
| Grafana | `localhost:3000` |
| Jaeger có trace | `localhost:16686` |
| PG | `psql -h localhost -c 'select 1'` |
| Redis | `redis-cli ping` |
| Replica lag | `psql -p 5433 -c 'select now() - pg_last_xact_replay_timestamp()'` |

## Trước mỗi lần benchmark

- [ ] `scripts/chaos/reset.sh` — đảm bảo không còn `tc` rule từ lần trước
- [ ] `tc qdisc show dev lo` — xác nhận sạch
- [ ] Mở dashboard `business.json`
- [ ] Warm up 2 phút (JIT) trước khi lấy số
- [ ] Ghi lại: pool size, heap, GC, strategy, data size

Bỏ qua bước 1-2 là nguyên nhân phổ biến nhất của "số đo hôm nay khác hôm qua mà không
hiểu vì sao".
