package com.lab.order.dto;

import java.util.List;

/**
 * Số liệu hiện lên UI. Hợp đồng đã chốt với frontend (api.ts).
 * Đổi field ở đây thì phải đổi cả `interface Meta` bên TypeScript.
 *
 * bytes = 0 từ server: không biết được trước khi Jackson serialize xong.
 * Frontend điền lại từ Content-Length — đó mới là số byte người dùng thật sự tải.
 */
public record Meta(
        long         tookMs,
        int          queryCount,
        long         bytes,
        List<String> optsOn
) {}
