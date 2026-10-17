package com.lab.order;

import com.lab.order.dto.OrderItem;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Nơi 5 công tắc cắm vào. VÒNG 0 chỉ có đường NAIVE.
 * Mỗi vòng sau thêm một nhánh BÊN CẠNH — không xoá, vì phải bật/tắt so sánh được.
 */
@Service
public class OrderService {

    private static final String[] STATUS = { "PENDING", "PAID", "CANCELLED" };

    private final OrderRepository repo;

    @PersistenceContext
    private EntityManager em;

    public OrderService(OrderRepository repo) { this.repo = repo; }

    /** Kết quả + thời gian tách riêng DB và mapping. */
    public record Result(List<OrderItem> items, long dbMs, long mapMs) {}

    /**
     * @Transactional BẮT BUỘC: open-in-view=false nên mapping phải nằm trong
     * transaction, nếu không getCustomer() ném LazyInitializationException.
     */
    @Transactional(readOnly = true)
    public Result list(Long customerId, int page, int size, String cursor, Set<String> opts) {

        // ── VÒNG 3 cắm vào đây: opts.contains("page") -> keyset WHERE id > :cursor
        // ── VÒNG 2 cắm vào đây: opts.contains("n1")   -> @Query join fetch
        // ── VÒNG 1: công tắc "index" KHÔNG đổi code — index nằm ở DB,
        //            bật/tắt bằng CREATE INDEX / DROP INDEX

        long t0 = System.nanoTime();
        List<Order> rows = (customerId != null && customerId > 0)
                ? repo.findByCustomer_IdOrderById(customerId, PageRequest.of(page, size))
                : repo.findAllByOrderById(PageRequest.of(page, size));
        long dbMs = ms(t0);

        // N+1 xảy ra TRONG khối này, không phải ở trên: lazy load kích hoạt
        // lúc đọc getCustomer(). Đó là lý do tách dbMs và mapMs.
        long t1 = System.nanoTime();
        boolean lean = opts.contains("payload");          // VÒNG 4
        List<OrderItem> items = rows.stream().map(o -> toItem(o, lean)).toList();
        long mapMs = ms(t1);

        return new Result(items, dbMs, mapMs);
    }

    /** EXPLAIN (ANALYZE, BUFFERS) của truy vấn tương đương — hiện thẳng lên UI. */
    @Transactional(readOnly = true)
    public String explain(Long customerId, int page, int size) {
        String where = (customerId != null && customerId > 0) ? "WHERE customer_id = :cid " : "";
        String sql = "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders " + where
                   + "ORDER BY id LIMIT :lim OFFSET :off";
        var q = em.createNativeQuery(sql)
                  .setParameter("lim", size)
                  .setParameter("off", (long) page * size);
        if (!where.isEmpty()) q.setParameter("cid", customerId);
        @SuppressWarnings("unchecked")
        List<String> lines = q.getResultList();
        return String.join("\n", lines);
    }

    private OrderItem toItem(Order o, boolean lean) {
        String name   = o.getCustomer().getName();   // ← LAZY, đây là N+1
        String status = STATUS[o.getStatus()];
        String at     = o.getCreatedAt().toString();
        return lean
                ? OrderItem.lean(o.getId(), name, o.getAmountCents(), status, at)
                : new OrderItem(o.getId(), name, o.getAmountCents(), status, at, o.getNote());
    }

    private static long ms(long sinceNano) { return (System.nanoTime() - sinceNano) / 1_000_000; }
}
