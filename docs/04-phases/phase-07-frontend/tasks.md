# Phase 7 — Task breakdown

## Nhóm A — Baseline & đo lường

| ID | Task | Est | Output |
|---|---|---|---|
| P7-T01 | Vite + React + TS skeleton, 4 trang (list, detail, checkout, queue) | 5h | |
| P7-T02 | ⚠️ `nvm install 22` — Node 18 hiện tại không đủ cho Vite mới | 1h | |
| P7-T03 | Lighthouse baseline **dưới throttle** (CPU 4× + Slow 3G) | 2h | ★ mốc so sánh |
| P7-T04 | `lib/vitals.ts` — `web-vitals` → POST backend → Prometheus → Grafana | 4h | ★ RUM thật |
| P7-T05 | `rollup-plugin-visualizer` — phân tích bundle | 2h | |

## Nhóm B — Bundle

| ID | Task | Est | Output |
|---|---|---|---|
| P7-T06 | Tìm và loại dep nặng vô ích (moment, lodash full, icon set) | 3h | ★ thường giảm nhiều nhất |
| P7-T07 | Code splitting theo route + `React.lazy` | 4h | |
| P7-T08 | `manualChunks` — tách vendor khỏi app code | 2h | cache tốt hơn giữa deploy |
| P7-T09 | Đo lại bundle + LCP sau T06-T08 | 2h | |

## Nhóm C — Render

| ID | Task | Est | Output |
|---|---|---|---|
| P7-T10 | React Profiler — tìm component re-render vô ích | 3h | |
| P7-T11 | Áp `memo`/`useMemo`/`useCallback` **và đo xem có nhanh hơn thật không** | 4h | ★ thường là không |
| P7-T12 | Virtual scrolling (`@tanstack/react-virtual`) cho list vé dài | 4h | tối ưu thật |
| P7-T13 | Đo số DOM node + INP trước/sau virtual scroll | 2h | |

## Nhóm D — Data & network

| ID | Task | Est | Output |
|---|---|---|---|
| P7-T14 | TanStack Query: cache + stale-while-revalidate | 4h | |
| P7-T15 | Optimistic update cho nút giữ chỗ | 3h | cải thiện cảm nhận |
| P7-T16 | `client.ts` — tự sinh `Idempotency-Key`, retry theo `Retry-After` | 3h | ★ tôn trọng backend |
| P7-T17 | nginx: brotli + HTTP/2 + cache header | 3h | |
| P7-T18 | SSE vs polling cho hàng chờ — đo băng thông, số connection, độ trễ | 4h | ★ |
| P7-T19 | Lighthouse + Web Vitals cuối, dưới throttle | 2h | |
| P7-T20 | `results/phase-07-frontend/fe-report.md` | 3h | |

**Tổng ~60h ≈ 1 tuần**
