# Tài liệu hệ thống

Trung tâm tài liệu của dự án. Mỗi chủ đề có **đúng một** nơi chứa — không trùng lặp.

| Thư mục | Chứa gì | Đọc khi nào |
|---|---|---|
| [`01-overview/`](01-overview/) | Bài toán, SLO, nguyên tắc, thuật ngữ | Ngày đầu tiên |
| [`02-design/`](02-design/) | HLD, LLD, schema, API, capacity | Trước khi code |
| [`03-diagrams/`](03-diagrams/) | ERD, sequence, state, architecture | Khi cần hình dung luồng |
| [`04-phases/`](04-phases/) | 10 giai đoạn — task, checklist, số liệu | Mỗi ngày làm việc |
| [`05-runbook/`](05-runbook/) | Cách bật/tắt, chaos, profiling | Khi vận hành |
| [`06-decisions/`](06-decisions/) | ADR — quyết định kiến trúc + lý do | Khi quyết điều gì |
| [`07-testing/`](07-testing/) | Chiến lược test, invariant, load profile | Khi viết test |

## Đường đọc theo vai

**Mới vào dự án** → [bài toán](01-overview/problem.md) → [HLD](02-design/hld.md) → [architecture](03-diagrams/architecture.md) → [phase hiện tại](04-phases/)

**Bắt đầu code** → [LLD](02-design/lld.md) → [data model](02-design/data-model.md) → [API contract](02-design/api-contract.md) → [tasks của phase](04-phases/)

**Đang debug hiệu năng** → [bottleneck map](03-diagrams/bottleneck-map.md) → [metrics catalog](02-design/observability.md) → [profiling](05-runbook/profiling.md)

## Quy tắc viết tài liệu

1. **Một chủ đề một file.** Trùng lặp = tài liệu sẽ lệch nhau sau 2 tuần.
2. **Sơ đồ bằng mermaid**, không chụp ảnh. Ảnh không diff được trong git.
3. **ADR viết ngay lúc quyết**, không viết hồi tố. Hồi tố là viết lại lịch sử.
4. **Số liệu thuộc về [`results/`](../results/)**, không nằm trong docs. Docs nói *sẽ đo gì*, results nói *đo được gì*.
