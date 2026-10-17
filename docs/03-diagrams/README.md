# Sơ đồ

Tất cả bằng **mermaid**, không chụp ảnh — ảnh không diff được trong git và sẽ lệch với code.

| Sơ đồ | Loại | Trả lời câu hỏi |
|---|---|---|
| [architecture.md](architecture.md) | flowchart | Hệ thống gồm những gì, nối với nhau thế nào |
| [erd.md](erd.md) | erDiagram | Dữ liệu quan hệ ra sao |
| [bottleneck-map.md](bottleneck-map.md) | flowchart | Phase nào tấn công nghẽn nào |
| [sequence-reserve.md](sequence-reserve.md) | sequenceDiagram | Luồng giữ chỗ (hot path) |
| [sequence-confirm.md](sequence-confirm.md) | sequenceDiagram | Luồng xác nhận đơn |
| [sequence-release.md](sequence-release.md) | sequenceDiagram | Luồng trả vé — nơi bug trốn |
| [sequence-queue.md](sequence-queue.md) | sequenceDiagram | Hàng chờ + SSE |
| [state-reservation.md](state-reservation.md) | stateDiagram | Vòng đời một reservation |
| [cache-tiers.md](cache-tiers.md) | flowchart | Đường đi của một lần đọc |
| [admission-funnel.md](admission-funnel.md) | flowchart | 50k req/s bị lọc thế nào |
| [strategy-tree.md](strategy-tree.md) | flowchart | 5 chiến lược concurrency |
| [package-deps.md](package-deps.md) | flowchart | Phụ thuộc giữa package backend |
| [phase-dependency.md](phase-dependency.md) | flowchart | Thứ tự làm các phase |

## Xem sơ đồ

- **VS Code** — extension *Markdown Preview Mermaid Support*
- **GitHub** — render tự động trong markdown
- **CLI** — `npx @mermaid-js/mermaid-cli -i file.md -o out.svg` (tải ~200MB puppeteer)
