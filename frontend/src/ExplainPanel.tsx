import { useState } from 'react'
import type { Meta } from './api.ts'
import PlanTree from './PlanTree.tsx'

/** Đánh dấu dòng quan trọng trong EXPLAIN — đây là thứ cần học đọc. */
function classify(line: string): string {
  if (/Seq Scan/.test(line)) return 'ex-bad'
  if (/Index (Only )?Scan|Bitmap/.test(line)) return 'ex-good'
  if (/rows=\d+\) \(actual .*rows=/.test(line)) return 'ex-rows'
  if (/Buffers:/.test(line)) return 'ex-buf'
  return ''
}

export default function ExplainPanel({ meta, on, onToggle }:
  { meta: Meta | null; on: boolean; onToggle: (v: boolean) => void }) {

  const [open, setOpen] = useState(true)

  return (
    <section className="card">
      <button className="cardhead" onClick={() => setOpen((o) => !o)}>
        <span className="caret">{open ? '▾' : '▸'}</span>
        <b>EXPLAIN (ANALYZE, BUFFERS)</b>
        <label className="switch sm" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />
          chạy
        </label>
        <span className="muted">tốn thêm 1 truy vấn — không tính vào số đếm</span>
      </button>
      {open && (
        <>
          {meta?.explain && <PlanTree meta={meta} />}
          {meta?.explain ? (
            <pre className="explain">
              {meta.explain.split('\n').map((l, i) => (
                <div key={i} className={classify(l)}>{l}</div>
              ))}
            </pre>
          ) : (
            <div className="muted pad">Bật "chạy" để xem kế hoạch truy vấn.</div>
          )}
          {meta?.explain && (
            <div className="exhint">
              <b className="ex-bad">Seq Scan</b> = quét cả bảng ·
              <b className="ex-good"> Index Scan</b> = dùng index ·
              <b> rows=</b> planner ĐOÁN vs <b>actual rows=</b> THẬT — lệch nhiều thì cần{' '}
              <code>ANALYZE</code>
            </div>
          )}
        </>
      )}
    </section>
  )
}
