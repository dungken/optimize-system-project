import type { Meta } from './api.ts'

/**
 * tookMs = dbMs + mapMs + phần còn lại (framework, JSON, filter).
 *
 * Vì sao tách: với N+1, thời gian KHÔNG nằm ở dbMs mà ở mapMs — lazy load
 * kích hoạt lúc đọc getCustomer() trong lúc mapping. Nhìn một con số tổng
 * thì không bao giờ biết điều đó.
 */
export default function TimeBreakdown({ meta }: { meta: Meta | null }) {
  if (!meta || meta.tookMs <= 0) return null
  const other = Math.max(meta.tookMs - meta.dbMs - meta.mapMs, 0)
  const parts = [
    { k: 'db',    label: 'truy vấn DB',  v: meta.dbMs,  cls: 'p-db' },
    { k: 'map',   label: 'map → DTO',    v: meta.mapMs, cls: 'p-map' },
    { k: 'other', label: 'framework',    v: other,      cls: 'p-other' },
  ].filter((p) => p.v > 0)

  return (
    <div className="tb">
      <div className="tbbar">
        {parts.map((p) => (
          <div key={p.k} className={`tbseg ${p.cls}`}
               style={{ width: `${(p.v / meta.tookMs) * 100}%` }}
               title={`${p.label}: ${p.v} ms`} />
        ))}
      </div>
      <div className="tblegend">
        {parts.map((p) => (
          <span key={p.k}>
            <i className={p.cls} /> {p.label} <b>{p.v} ms</b>
          </span>
        ))}
        <span className="muted">tổng {meta.tookMs} ms</span>
      </div>
      {meta.mapMs > meta.dbMs && meta.queryCount > 10 && (
        <div className="tbnote">
          ⚠️ Thời gian nằm ở <b>mapping</b>, không phải truy vấn — dấu hiệu kinh điển của
          N+1: lazy load kích hoạt khi đọc <code>getCustomer()</code>.
        </div>
      )}
    </div>
  )
}
