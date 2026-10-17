import { useState } from 'react'
import { fetchOrders, type Opt } from './api.ts'

interface Point { x: number; tookMs: number; label: string }

const PAGES = [0, 10, 100, 1_000, 5_000, 10_000, 19_999]

/**
 * Chạy một LOẠT phép đo rồi vẽ đường — thứ mà bấm tay từng cái không cho thấy.
 *
 * Vòng 3: OFFSET tăng TUYẾN TÍNH theo số trang, keyset PHẲNG.
 * Chỉ khi nhìn cả đường mới thấy được hình dạng đó; đo 2 điểm thì không.
 */
export default function Sweep({ opts, customerId }: { opts: Opt[]; customerId: number }) {
  const [data, setData] = useState<Point[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)

  async function run() {
    setRunning(true); setData([]); setDone(0)
    const out: Point[] = []
    for (const p of PAGES) {
      // warm-up 1 lần rồi mới lấy số -> tránh đo nhầm JIT
      await fetchOrders({ opts, customerId, page: p, size: 100 })
      const res = await fetchOrders({ opts, customerId, page: p, size: 100 })
      out.push({ x: p, tookMs: res.meta.tookMs, label: p.toLocaleString('vi-VN') })
      setData([...out]); setDone(out.length)
    }
    setRunning(false)
  }

  const W = 700, H = 240, PAD = { l: 56, r: 16, t: 16, b: 38 }
  const maxY = Math.max(...data.map((d) => d.tookMs), 10)
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b
  const px = (i: number) => PAD.l + (i / (PAGES.length - 1)) * iw
  const py = (v: number) => PAD.t + ih - (v / maxY) * ih

  return (
    <section className="card">
      <div className="cardhead static">
        <b>Biểu đồ: thời gian theo số trang</b>
        <button onClick={run} disabled={running}>
          {running ? `đang đo ${done}/${PAGES.length}…` : 'chạy đo'}
        </button>
        <span className="muted">
          {opts.length ? `công tắc: ${opts.join(', ')}` : 'naive'} · mỗi điểm warm-up 1 lần
        </span>
      </div>

      {data.length > 1 ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="chart" role="img"
               aria-label="Thời gian theo số trang">
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.l} y1={py(maxY * f)} x2={W - PAD.r} y2={py(maxY * f)}
                      stroke="#eaeef2" />
                <text x={PAD.l - 8} y={py(maxY * f) + 4} textAnchor="end"
                      fontSize={11} fill="#656d76">{Math.round(maxY * f)}</text>
              </g>
            ))}
            <text x={14} y={PAD.t + ih / 2} fontSize={11} fill="#656d76"
                  transform={`rotate(-90 14 ${PAD.t + ih / 2})`} textAnchor="middle">ms</text>

            <polyline fill="none" stroke="#cf222e" strokeWidth={2.5}
                      points={data.map((d, i) => `${px(i)},${py(d.tookMs)}`).join(' ')} />
            {data.map((d, i) => (
              <g key={d.x}>
                <circle cx={px(i)} cy={py(d.tookMs)} r={4} fill="#cf222e" />
                <text x={px(i)} y={py(d.tookMs) - 10} textAnchor="middle"
                      fontSize={11} fill="#cf222e" fontWeight={600}>{d.tookMs}</text>
                <text x={px(i)} y={H - 14} textAnchor="middle" fontSize={11} fill="#656d76">
                  {d.label}
                </text>
              </g>
            ))}
            <text x={PAD.l + iw / 2} y={H - 1} textAnchor="middle" fontSize={11} fill="#656d76">
              số trang (size=100)
            </text>
          </svg>
          <div className="chartnote">
            {data.at(-1)!.tookMs > data[0].tookMs * 3
              ? <>📈 Đường <b>dốc lên</b> — <code>OFFSET N</code> buộc Postgres đọc rồi <b>bỏ</b> N
                  dòng. Trang càng sâu càng chậm. Keyset sẽ cho đường <b>phẳng</b>.</>
              : <>📉 Đường <b>phẳng</b> — chi phí không phụ thuộc vị trí trang. Đây là hình dạng
                  bạn muốn thấy sau vòng 3.</>}
          </div>
        </>
      ) : (
        <div className="muted pad">
          Bấm "chạy đo" — chạy {PAGES.length} phép đo ở các vị trí trang khác nhau rồi vẽ đường.
          Chạy lại sau khi bật công tắc <code>page</code> để so hai hình dạng.
        </div>
      )}
    </section>
  )
}
