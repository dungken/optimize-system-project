import mock from './meta.mock.json'

// Task 0.10 ✅ — đã nối backend thật.
// Đặt lại true nếu muốn làm UI khi backend chưa chạy (banner đỏ sẽ hiện).
export const USE_MOCK = false

export type Opt = 'index' | 'n1' | 'page' | 'payload' | 'pool'

// Hình dạng đã chốt với backend — đổi ở đây thì phải đổi cả MeasureFilter
export interface SqlGroup { sql: string; count: number }
export interface Pool { active: number; idle: number; pending: number; max: number }

export interface Meta {
  tookMs: number
  dbMs: number          // thời gian trong repository
  mapMs: number         // map entity -> DTO. N+1 nằm Ở ĐÂY, không phải dbMs
  queryCount: number
  bytes: number
  optsOn: string[]
  sql: SqlGroup[]       // SQL đã gom nhóm kèm số lần
  pool: Pool
  explain: string | null
}

export interface OrderItem {
  id: number
  customerName: string
  amountCents: number
  status: string
  createdAt: string
}

export interface OrdersResponse {
  items: OrderItem[]
  nextCursor: string | null
  meta: Meta
}

export interface OrdersQuery {
  opts: Opt[]
  customerId?: number
  page?: number
  size?: number
  cursor?: string
  explain?: boolean
}

export async function fetchOrders(q: OrdersQuery): Promise<OrdersResponse> {
  if (USE_MOCK) return fetchMock(q)

  const params = new URLSearchParams({ opt: q.opts.join(',') })
  if (q.customerId != null) params.set('customerId', String(q.customerId))
  if (q.page != null) params.set('page', String(q.page))
  if (q.size != null) params.set('size', String(q.size))
  if (q.cursor) params.set('cursor', q.cursor)
  if (q.explain) params.set('explain', 'true')

  const res = await fetch(`/api/orders?${params}`)
  if (!res.ok) throw new Error(`GET /api/orders → HTTP ${res.status}`)

  // `bytes` server KHÔNG biết được (chưa serialize xong lúc dựng meta).
  // Đo ở đây mới đúng: đây là số byte trình duyệt THẬT SỰ tải về.
  const text = await res.text()
  const body: OrdersResponse = JSON.parse(text)
  const header = res.headers.get('content-length')
  body.meta.bytes = header ? Number(header) : new Blob([text]).size
  return body
}

// Mock: số baseline lấy từ meta.mock.json, mỗi công tắc bật thì đổi số theo mức docs dự kiến.
// Chỉ để UI có số khác nhau mà so sánh; `page` và `pool` không giả lập.
async function fetchMock(q: OrdersQuery): Promise<OrdersResponse> {
  const meta: Meta = {
    ...mock.meta, optsOn: q.opts,
    dbMs: 0, mapMs: 0, sql: [], explain: null,
    pool: { active: 0, idle: 0, pending: 0, max: 0 },
  }
  if (q.opts.includes('index')) meta.tookMs = Math.round(meta.tookMs / 80)
  if (q.opts.includes('n1')) meta.queryCount = 1
  if (q.opts.includes('payload')) meta.bytes = 80_000

  await new Promise((resolve) => setTimeout(resolve, meta.tookMs)) // chậm thật để thấy cảm giác
  return { ...mock, meta }
}
