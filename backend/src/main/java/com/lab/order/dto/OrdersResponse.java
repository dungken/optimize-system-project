package com.lab.order.dto;

import java.util.List;

public record OrdersResponse(
        List<OrderItem> items,
        String          nextCursor,   // null khi hết trang — KHÔNG phải chuỗi rỗng
        Meta            meta
) {}
