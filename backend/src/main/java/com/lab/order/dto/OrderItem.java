package com.lab.order.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Một dòng trên bảng.
 *
 * `note` là cột NẶNG (~420 byte/dòng) và UI KHÔNG hiển thị nó.
 *   - đường naive  : trả note  → payload phình, đúng lỗi thật ngoài đời
 *   - vòng 4 (fast): note = null → @JsonInclude bỏ hẳn field khỏi JSON
 *
 * TypeScript không khai báo `note` — thừa field trong JSON là vô hại.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record OrderItem(
        long   id,
        String customerName,
        long   amountCents,
        String status,
        String createdAt,
        String note
) {
    /** DTO gọn — vòng 4 dùng. */
    public static OrderItem lean(long id, String customerName, long amountCents,
                                 String status, String createdAt) {
        return new OrderItem(id, customerName, amountCents, status, createdAt, null);
    }
}
