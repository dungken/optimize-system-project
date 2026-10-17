// TẠM — chỉ để xem MetaBar chạy trên mock.
// Task 0.5 (DUNG) viết lại file này: bảng đơn + 5 checkbox, giữ <MetaBar meta={...} />.
import { useState } from 'react'
import { fetchOrders, type Meta, type Opt } from './api.ts'
import MetaBar from './MetaBar.tsx'

const PRESETS: Opt[][] = [[], ['index'], ['index', 'n1'], ['index', 'n1', 'payload']]

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)

  async function call(opts: Opt[]) {
    setLoading(true)
    const res = await fetchOrders({ opts, customerId: 123 })
    setMeta(res.meta)
    setLoading(false)
  }

  return (
    <main>
      <MetaBar meta={meta} />
      <p>
        {PRESETS.map((opts) => (
          <button key={opts.join() || 'naive'} disabled={loading} onClick={() => call(opts)}>
            {opts.length ? opts.join(' + ') : 'naive'}
          </button>
        ))}
        {loading && ' đang gọi…'}
      </p>
    </main>
  )
}
