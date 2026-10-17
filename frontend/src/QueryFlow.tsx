import type { Meta } from './api.ts'

/**
 * Sơ đồ luồng truy vấn — vẽ lại theo số query thật.
 *
 * Mục đích: N+1 là khái niệm trừu tượng khi chỉ nhìn con số "101".
 * Thấy 100 mũi tên toả ra thì hiểu ngay chuyện gì đang xảy ra.
 */
export default function QueryFlow({ meta }: { meta: Meta | null }) {
  if (!meta) return null

  const n = meta.queryCount
  const joined = meta.optsOn.includes('n1')
  const fan = Math.max(0, n - 1)          // số query customers (ngoài 1 query orders)
  const DRAW = Math.min(fan, 14)          // vẽ tối đa 14 mũi tên, còn lại ghi số

  const W = 760, H = 150
  const xApp = 120, xDb = 620
  const yMid = H / 2

  return (
    <div className="flow">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
           aria-label={`Luồng truy vấn: ${n} câu SQL`}>
        {/* App */}
        <rect x={40} y={yMid - 26} width={80} height={52} rx={8}
              fill="var(--card)" stroke="#8b949e" />
        <text x={80} y={yMid + 5} textAnchor="middle" fontSize={14}>App</text>

        {/* DB */}
        <ellipse cx={xDb + 45} cy={yMid - 26} rx={45} ry={10}
                 fill="var(--card)" stroke="#8b949e" />
        <rect x={xDb} y={yMid - 26} width={90} height={52}
              fill="var(--card)" stroke="#8b949e" />
        <line x1={xDb} y1={yMid - 26} x2={xDb} y2={yMid + 26} stroke="#8b949e" />
        <line x1={xDb + 90} y1={yMid - 26} x2={xDb + 90} y2={yMid + 26} stroke="#8b949e" />
        <ellipse cx={xDb + 45} cy={yMid + 26} rx={45} ry={10}
                 fill="var(--card)" stroke="#8b949e" />
        <text x={xDb + 45} y={yMid + 8} textAnchor="middle" fontSize={13}>Postgres</text>

        {joined ? (
          <>
            <line x1={xApp} y1={yMid} x2={xDb} y2={yMid}
                  stroke="var(--good)" strokeWidth={3} markerEnd="url(#ar-good)" />
            <text x={(xApp + xDb) / 2} y={yMid - 14} textAnchor="middle"
                  fontSize={13} fill="var(--good)">
              1 câu — SELECT orders JOIN customers
            </text>
          </>
        ) : (
          <>
            {/* 1 query lấy orders */}
            <line x1={xApp} y1={yMid - 42} x2={xDb} y2={yMid - 42}
                  stroke="var(--muted)" strokeWidth={2} markerEnd="url(#ar-muted)" />
            <text x={(xApp + xDb) / 2} y={yMid - 50} textAnchor="middle"
                  fontSize={12} fill="var(--muted)">1 × SELECT orders</text>

            {/* fan-out: mỗi dòng một SELECT customers */}
            {Array.from({ length: DRAW }, (_, i) => {
              const y = yMid - 10 + (i * 44) / Math.max(DRAW - 1, 1)
              return (
                <line key={i} x1={xApp} y1={yMid} x2={xDb} y2={y}
                      stroke="var(--bad)" strokeWidth={1.2} opacity={0.55} />
              )
            })}
            {fan > 0 && (
              <text x={(xApp + xDb) / 2} y={yMid + 56} textAnchor="middle"
                    fontSize={13} fill="var(--bad)" fontWeight={600}>
                {fan} × SELECT customers — mỗi dòng một câu (N+1)
              </text>
            )}
          </>
        )}

        <defs>
          <marker id="ar-good" markerWidth="9" markerHeight="9" refX="8" refY="3"
                  orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="var(--good)" /></marker>
          <marker id="ar-muted" markerWidth="9" markerHeight="9" refX="8" refY="3"
                  orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="var(--muted)" /></marker>
        </defs>
      </svg>

      <div className="flowcap">
        {joined
          ? 'Một câu JOIN lấy đủ dữ liệu — số query không tăng theo số dòng.'
          : fan > 1
            ? `Mỗi dòng trên bảng sinh thêm một câu SELECT customers. Thêm dòng = thêm query.`
            : 'Tất cả dòng cùng một khách → Hibernate cache lại, chỉ 1 câu customers. Đặt customerId=0 để thấy N+1.'}
      </div>
    </div>
  )
}
