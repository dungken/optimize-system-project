import type { Meta } from './api.ts'

export interface Run { meta: Meta; at: number }

type Key = 'tookMs' | 'queryCount' | 'bytes'
const COLS: { key: Key; head: string; fmt: (n: number) => string }[] = [
  { key: 'tookMs',     head: '⏱ thời gian', fmt: (n) => `${n} ms` },
  { key: 'queryCount', head: '🔍 query',     fmt: (n) => `${n}` },
  { key: 'bytes',      head: '📦 payload',   fmt: fmtBytes },
]

function fmtBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`
  return `${n} B`
}

function label(opts: string[]): string {
  return opts.length ? opts.join(' + ') : 'naive'
}

/**
 * Lịch sử đo — cột ngang, tỉ lệ theo giá trị LỚN NHẤT từng cột.
 *
 * Vì sao cần: MetaBar chỉ so với lần ngay trước. Bật/tắt vài lần là mất
 * số cũ. Bảng này giữ cả quá trình → thấy được toàn bộ hành trình tối ưu
 * trong một màn hình, và đó chính là thứ phải chép vào docs/steps.md.
 */
export default function History({ runs, onClear }: { runs: Run[]; onClear: () => void }) {
  if (!runs.length) return null

  const max: Record<Key, number> = {
    tookMs:     Math.max(...runs.map((r) => r.meta.tookMs), 1),
    queryCount: Math.max(...runs.map((r) => r.meta.queryCount), 1),
    bytes:      Math.max(...runs.map((r) => r.meta.bytes), 1),
  }
  const best: Record<Key, number> = {
    tookMs:     Math.min(...runs.map((r) => r.meta.tookMs)),
    queryCount: Math.min(...runs.map((r) => r.meta.queryCount)),
    bytes:      Math.min(...runs.map((r) => r.meta.bytes)),
  }

  return (
    <div className="history">
      <div className="hhead">
        <b>Lịch sử đo</b> <span className="muted">({runs.length} lần — chép số này vào steps.md)</span>
        <button className="link" onClick={onClear}>xoá</button>
      </div>

      <table className="htable">
        <thead>
          <tr>
            <th>công tắc</th>
            {COLS.map((c) => <th key={c.key} colSpan={2}>{c.head}</th>)}
          </tr>
        </thead>
        <tbody>
          {runs.map((r, i) => (
            <tr key={r.at}>
              <td className="hlabel">
                <span className="hidx">{runs.length - i}</span> {label(r.meta.optsOn)}
              </td>
              {COLS.map((c) => {
                const v = r.meta[c.key]
                const isBest = v === best[c.key]
                return [
                  <td key={c.key + 'b'} className="hbarcell">
                    <div className={`hbar ${isBest ? 'best' : ''}`}
                         style={{ width: `${Math.max((v / max[c.key]) * 100, 2)}%` }} />
                  </td>,
                  <td key={c.key + 'v'} className={`hval ${isBest ? 'best' : ''}`}>
                    {c.fmt(v)}
                  </td>,
                ]
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="muted hfoot">Cột xanh = tốt nhất trong các lần đã đo.</div>
    </div>
  )
}
