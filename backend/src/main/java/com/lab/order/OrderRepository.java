package com.lab.order;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Task 0.6 — repository NAIVE.
 *
 * CỐ Ý chỉ có truy vấn ngây thơ:
 *   - lọc theo customer_id khi CHƯA có index  -> vòng 1
 *   - Pageable = OFFSET                        -> vòng 3
 *   - trả entity, customer LAZY                -> vòng 2 (N+1)
 *
 * Các vòng sau thêm phương thức mới BÊN CẠNH, không xoá cái cũ —
 * phải giữ được cả hai để công tắc bật/tắt so sánh được.
 */
public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByCustomer_IdOrderById(Long customerId, Pageable pageable);

    List<Order> findAllByOrderById(Pageable pageable);

    // VÒNG 2 thêm vào đây: @Query("... join fetch o.customer ...")
    // VÒNG 3 thêm vào đây: findByIdGreaterThanOrderById(...)  (keyset)
}
