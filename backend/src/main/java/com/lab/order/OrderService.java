package com.lab.order;

import com.lab.order.dto.OrderItem;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Nơi 5 công tắc cắm vào.
 *
 * VÒNG 0 chỉ có đường NAIVE. Mỗi vòng sau thêm một nhánh `if (opts.contains(...))`
 * BÊN CẠNH đường naive — không xoá, vì phải bật/tắt so sánh được.
 */
@Service
public class OrderService {

    /** DB lưu smallint; UI cần chữ. Hợp đồng với frontend: "PENDING"|"PAID"|"CANCELLED". */
    private static final String[] STATUS = { "PENDING", "PAID", "CANCELLED" };

    private final OrderRepository repo;

    public OrderService(OrderRepository repo) {
        this.repo = repo;
    }

    /**
     * @Transactional BẮT BUỘC ở đây vì open-in-view=false.
     * Mapping sang DTO phải nằm TRONG transaction, nếu không
     * getCustomer().getName() ném LazyInitializationException.
     * Đó cũng là lý do N+1 xảy ra đúng chỗ này — thấy được, đếm được.
     */
    @Transactional(readOnly = true)
    public List<OrderItem> list(Long customerId, int page, int size, String cursor, Set<String> opts) {

        // ── VÒNG 3 cắm vào đây: nếu opts.contains("page") thì dùng keyset
        //    repo.findByIdGreaterThanOrderById(Long.parseLong(cursor), limit)
        //    thay cho PageRequest.of(page, size)  (OFFSET)

        // ── VÒNG 1: công tắc "index" không đổi code — index là thứ tồn tại ở DB.
        //    Bật/tắt bằng CREATE INDEX / DROP INDEX, service giữ nguyên.
        //    (giữ opts.contains("index") trong optsOn chỉ để ghi lại trạng thái)

        // ── VÒNG 2 cắm vào đây: nếu opts.contains("n1") thì dùng truy vấn join fetch

        List<Order> rows = (customerId != null && customerId > 0)
                ? repo.findByCustomer_IdOrderById(customerId, PageRequest.of(page, size))
                : repo.findAllByOrderById(PageRequest.of(page, size));

        return rows.stream().map(this::toItemNaive).toList();
    }

    /**
     * Đường NAIVE: đọc customer qua quan hệ LAZY.
     * Mỗi dòng sinh thêm MỘT câu SELECT customers → 100 dòng = 101 query.
     *
     * VÒNG 2 sẽ thêm toItemFast() dùng dữ liệu đã join sẵn.
     * VÒNG 4 sẽ thêm bản chỉ lấy 5 cột, bỏ cột `note`.
     */
    private OrderItem toItemNaive(Order o) {
        return new OrderItem(
                o.getId(),
                o.getCustomer().getName(),      // ← LAZY, đây là N+1
                o.getAmountCents(),
                STATUS[o.getStatus()],
                o.getCreatedAt().toString()
        );
    }
}
