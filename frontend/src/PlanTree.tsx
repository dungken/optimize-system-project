import type { Meta } from './api.ts'

/** Một nút trong kế hoạch truy vấn. */
interface Node {
  depth: number
  label: string
  costTotal: number
  actualMs: number
  rowsEst: number
  rowsAct: number
  loops: number
  bad: boolean      // Seq Scan
  good: boolean     // Index Scan
  raw: string
}

/**
 * Biến EXPLAIN (một bức tường chữ) thành SƠ ĐỒ CÂY có thanh thời gian.
 *
 * Đây là kỹ năng khó nhất của tối ưu DB: đọc query plan. Dạng chữ thì phải
 * tự nhẩm indent và tự so rows=/actual rows=. Dạng cây có thanh tỉ lệ thì
 * thấy ngay nút nào ăn hết thời gian và nút nào planner đoán sai.
 */
function parse(explain: string): Node[] {
  const out: Node[] = []
  for (const raw of explain.split('\n')) {
    const m = raw.match(/^(\s*)(?:->\s+)?([A-Z][^(]*?)\s+\(cost=[\d.]+\.\.([\d.]+)\s+rows=(\d+)[^)]*\)(?:\s+\(actual time=[\d.]+\.\.([\d.]+)\s+rows=(\d+)\s+loops=(\d+)\))?/)
    if (!m) continue
    const label = m[2].trim()
    out.push({
      depth: Math.floor(m[1].length / 6),
      label,
      costTotal: Number(m[3]),
      actualMs: Number(m[5] ?? 0),
      rowsEst: Number(m[4]),
      rowsAct: Number(m[6] ?? 0),
      loops: Number(m[7] ?? 1),
      bad: /Seq Scan/i.test(label),
      good: /Index (Only )?Scan|Bitmap Index/i.test(label),
      raw,
    })
  }
  return out
}

function fmtRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export default function PlanTree({ meta }: { meta: Meta | null }) {
  if (!meta?.explain) return null
  const nodes = parse(meta.explain)
  if (!nodes.length) return null

  const maxMs = Math.max(...nodes.map((n) => n.actualMs), 0.001)

  return (
    <div className="plantree">
      <div className="ptlegend">
        <span><i className="dot bad" /> Seq Scan — quét cả bảng</span>
        <span><i className="dot good" /> Index Scan — dùng index</span>
        <span className="muted">thanh = thời gian thực · ước lượng → thật</span>
      </div>

      {nodes.map((n, i) => {
        // planner đoán lệch > 10 lần là dấu hiệu statistics cũ
        const skew = n.rowsAct > 0 && n.rowsEst > 0
          ? Math.max(n.rowsEst / n.rowsAct, n.rowsAct / n.rowsEst) : 1
        return (
          <div key={i} className="ptrow" style={{ paddingLeft: 8 + n.depth * 18 }}>
            <span className={`ptnode ${n.bad ? 'bad' : n.good ? 'good' : ''}`}>{n.label}</span>
            <div className="ptbarwrap">
              <div className={`ptbar ${n.bad ? 'bad' : n.good ? 'good' : ''}`}
                   style={{ width: `${Math.max((n.actualMs / maxMs) * 100, 1)}%` }} />
            </div>
            <span className="ptms">{n.actualMs.toFixed(1)} ms</span>
            <span className={`ptrows ${skew > 10 ? 'skew' : ''}`}
                  title={skew > 10 ? `Planner đoán lệch ${skew.toFixed(0)}× — cần ANALYZE` : ''}>
              {fmtRows(n.rowsEst)}→{fmtRows(n.rowsAct)}
              {skew > 10 && ` ⚠${skew.toFixed(0)}×`}
            </span>
            {n.loops > 1 && <span className="ptloops">×{n.loops}</span>}
          </div>
        )
      })}
    </div>
  )
}
