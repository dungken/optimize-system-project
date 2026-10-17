// Task 0.5 (DUNG) — bảng đơn hàng + 5 công tắc tối ưu.
// Giữ nguyên <MetaBar> của TRUNG (task 0.4), không sửa file đó.
import { useEffect, useState } from 'react'
import {
  fetchOrders, USE_MOCK,
  type Meta, type Opt, type OrderItem, type OrdersQuery,
} from './api.ts'
import MetaBar from './MetaBar.tsx'

/** 5 công tắc. Mô tả hiện khi hover — để biết đang bật/tắt cái gì. */
const SWITCHES: { opt: Opt; label: string; hint: string }[] = [
  { opt: 'index',   label: 'index',   hint: 'Vòng 1 — có index trên orders(customer_id)' },
  { opt: 'n1',      label: 'n1',      hint: 'Vòng 2 — JOIN FETCH thay vì lazy load từng dòng' },
  { opt: 'page',    label: 'page',    hint: 'Vòng 3 — keyset cursor thay vì OFFSET' },
  { opt: 'payload', label: 'payload', hint: 'Vòng 4 — DTO 5 cột thay vì entity đầy đủ' },
  { opt: 'pool',    label: 'pool',    hint: 'Vòng 5 — pool đổi bằng env POOL_SIZE, không phải công tắc này' },
]

const SIZE = 100          // page lớn để vòng 4 (payload) thấy khác biệt rõ
const LAST_PAGE = 19999   // 2M dòng / 100 = 20.000 trang

export default function App() {
  const [opts, setOpts] = useState<Opt[]>([])
  const [customerId, setCustomerId] = useState(123)
  const [page, setPage] = useState(0)
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const [items, setItems] = useState<OrderItem[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(opt: Opt) {
    setOpts((cur) => (cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt]))
  }

  /** Đổi trang kiểu OFFSET → reset cursor, vì hai cách phân trang loại trừ nhau. */
  function goPage(p: number) {
    setCursor(undefined)
    setPage(p)
  }

  async function load(q: OrdersQuery) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchOrders(q)
      setItems(res.items)
      setMeta(res.meta)
      setNextCursor(res.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // Gọi lại mỗi khi công tắc / khách / trang đổi. Bật công tắc là thấy số mới ngay.
  useEffect(() => {
    void load({ opts, customerId, page, size: SIZE, cursor })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts, customerId, page, cursor])

  return (
    <main>
      {USE_MOCK && (
        <div className="mockwarn">
          ⚠️ <b>ĐANG DÙNG MOCK</b> — số liệu là <b>giả</b>, tỉ lệ hardcode trong{' '}
          <code>api.ts</code>. Đừng ghi vào bảng kết quả. Đổi <code>USE_MOCK = false</code> ở
          task 0.10.
        </div>
      )}

      <h1>Đơn hàng</h1>
      <MetaBar meta={meta} />

      <div className="panel">
        <div className="row">
          <span className="rowlabel">Công tắc</span>
          {SWITCHES.map((s) => (
            <label key={s.opt} className="switch" title={s.hint}>
              <input
                type="checkbox"
                checked={opts.includes(s.opt)}
                onChange={() => toggle(s.opt)}
              />
              {s.label}
            </label>
          ))}
          <button className="link" onClick={() => setOpts([])} disabled={!opts.length}>
            tắt hết
          </button>
          <button
            className="link"
            onClick={() => setOpts(SWITCHES.map((s) => s.opt))}
            disabled={opts.length === SWITCHES.length}
          >
            bật hết
          </button>
        </div>

        <div className="row">
          <span className="rowlabel">customerId</span>
          <input
            type="number"
            value={customerId}
            min={1}
            max={200000}
            onChange={(e) => setCustomerId(Number(e.target.value) || 1)}
          />

          <span className="rowlabel">Trang</span>
          <button onClick={() => goPage(0)}>đầu</button>
          <button onClick={() => goPage(500)}>500</button>
          <button onClick={() => goPage(LAST_PAGE)}>cuối ({LAST_PAGE})</button>
          <span className="muted">
            đang ở {cursor ? `cursor ${cursor}` : `trang ${page}`}
          </span>
          <button
            onClick={() => setCursor(nextCursor ?? undefined)}
            disabled={!nextCursor}
            title="Dùng keyset — chỉ có tác dụng khi bật công tắc page"
          >
            trang sau (cursor) →
          </button>
        </div>
      </div>

      {error && <div className="err">Lỗi: {error}</div>}

      <table className={loading ? 'loading' : ''}>
        <thead>
          <tr>
            <th>id</th>
            <th>khách</th>
            <th className="num">số tiền</th>
            <th>trạng thái</th>
            <th>ngày</th>
          </tr>
        </thead>
        <tbody>
          {items.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>{o.customerName}</td>
              <td className="num">{(o.amountCents / 100).toLocaleString('vi-VN')} đ</td>
              <td>
                <span className={`st st-${o.status.toLowerCase()}`}>{o.status}</span>
              </td>
              <td>{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
            </tr>
          ))}
          {!items.length && !loading && (
            <tr>
              <td colSpan={5} className="muted">
                không có dòng nào
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="muted">
        {items.length} dòng · size={SIZE}
        {loading && ' · đang tải…'}
      </p>
    </main>
  )
}
