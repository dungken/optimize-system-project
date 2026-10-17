package com.lab.order.dto;

/** Một dòng trên bảng. customerName là chỗ sinh ra N+1 ở vòng 2. */
public record OrderItem(
        long   id,
        String customerName,
        long   amountCents,
        String status,
        String createdAt
) {}
