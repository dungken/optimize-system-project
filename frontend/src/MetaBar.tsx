import { useState } from 'react'
import type { Meta } from './api.ts'

type Key = 'tookMs' | 'queryCount' | 'bytes'

interface Metric {
  key: Key
  icon: string
  format: (n: number) => string
  words: [better: string, worse: string]
  warnAt: number // >= warnAt → vàng
  badAt: number //  >= badAt  → đỏ
}

const METRICS: Metric[] = [
  { key: 'tookMs', icon: '⏱', format: (n) => `${n} ms`, words: ['nhanh hơn', 'chậm hơn'], warnAt: 100, badAt: 500 },
  { key: 'queryCount', icon: '🔍', format: (n) => `${n} query`, words: ['ít hơn', 'nhiều hơn'], warnAt: 3, badAt: 20 },
  { key: 'bytes', icon: '📦', format: formatBytes, words: ['nhẹ hơn', 'nặng hơn'], warnAt: 200_000, badAt: 1_000_000 },
]

function formatBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`
  return `${n} B`
}

function level(m: Metric, v: number): string {
  if (v >= m.badAt) return 'bad'
  if (v >= m.warnAt) return 'warn'
  return 'good'
}

// "trước: 812 ms — nhanh hơn 81×". Lệch dưới 5% coi như nhiễu.
function diff(m: Metric, cur: number, prev: number): { text: string; tone: string } {
  const before = `trước: ${m.format(prev)}`
  if (cur === 0 || prev === 0 || Math.max(cur, prev) / Math.min(cur, prev) < 1.05) {
    return { text: `${before} — gần như không đổi`, tone: 'same' }
  }
  const better = cur < prev
  const ratio = better ? prev / cur : cur / prev
  const times = ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)
  return { text: `${before} — ${m.words[better ? 0 : 1]} ${times}×`, tone: better ? 'better' : 'worse' }
}

function optsLabel(opts: string[]): string {
  return opts.length ? opts.join(', ') : 'naive (không bật gì)'
}

/**
 * 3 ô số của lần gọi gần nhất + so với lần gọi trước đó.
 * Chỉ cần truyền `meta` của response mới nhất; MetaBar tự nhớ lần trước.
 * Truyền null lúc đang tải cũng được — thanh giữ nguyên số cũ.
 */
export default function MetaBar({ meta }: { meta: Meta | null }) {
  const [cur, setCur] = useState<Meta | null>(meta)
  const [prev, setPrev] = useState<Meta | null>(null)

  // Mỗi response là một object mới → khác tham chiếu nghĩa là vừa có lần gọi mới
  if (meta && meta !== cur) {
    setPrev(cur)
    setCur(meta)
  }

  if (!cur) return <div className="metabar empty">Chưa gọi API lần nào</div>

  return (
    <div className="metabar">
      <div className="cells">
        {METRICS.map((m) => {
          const v = cur[m.key]
          const d = prev ? diff(m, v, prev[m.key]) : null
          return (
            <div key={m.key} className={`cell ${level(m, v)}`}>
              <div className="value">
                {m.icon} {m.format(v)}
              </div>
              {d && <div className={`diff ${d.tone}`}>{d.text}</div>}
            </div>
          )
        })}
      </div>
      <div className="opts">
        Đang bật: <b>{optsLabel(cur.optsOn)}</b>
        {prev && <> · lần trước: {optsLabel(prev.optsOn)}</>}
      </div>
    </div>
  )
}
