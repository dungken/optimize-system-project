import { useState } from 'react'
import type { Meta } from './api.ts'

/** Danh sách SQL đã gom nhóm. Nhìn "× 100" trên một câu là hiểu N+1 ngay. */
export default function SqlList({ meta }: { meta: Meta | null }) {
  const [open, setOpen] = useState(true)
  if (!meta?.sql?.length) return null

  return (
    <section className="card">
      <button className="cardhead" onClick={() => setOpen((o) => !o)}>
        <span className="caret">{open ? '▾' : '▸'}</span>
        <b>SQL đã chạy</b>
        <span className="muted">
          {meta.sql.length} câu khác nhau · {meta.queryCount} lần gọi
        </span>
      </button>
      {open && (
        <div className="sqllist">
          {meta.sql.map((g, i) => (
            <div key={i} className={`sqlrow ${g.count > 10 ? 'hot' : ''}`}>
              <span className={`sqlcount ${g.count > 10 ? 'hot' : ''}`}>×{g.count}</span>
              <code>{g.sql}</code>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
