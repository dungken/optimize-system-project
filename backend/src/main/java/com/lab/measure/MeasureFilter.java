package com.lab.measure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Task 0.9 — bấm giờ mỗi request + dọn bộ đếm query.
 *
 * tookMs tính từ lúc vào filter đến lúc controller trả xong object,
 * tức là GỒM: truy vấn DB + mapping sang DTO.
 * KHÔNG gồm: thời gian Jackson serialize ra JSON và đẩy qua mạng.
 *
 * Phần không gồm đó chính là thứ vòng 4 (payload) đo — và đo ở phía
 * trình duyệt (Content-Length + thời gian tải), nơi nó thực sự có ý nghĩa.
 */
@Component
public class MeasureFilter extends OncePerRequestFilter {

    public static final String T0 = "lab.t0";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        QueryCounter.reset();
        req.setAttribute(T0, System.nanoTime());
        try {
            chain.doFilter(req, res);
        } finally {
            QueryCounter.clear();   // thread được tái sử dụng → luôn phải dọn
        }
    }

    /** Controller gọi để lấy số ms đã trôi qua. */
    public static long tookMs(HttpServletRequest req) {
        Object t0 = req.getAttribute(T0);
        if (t0 == null) return -1;
        return (System.nanoTime() - (long) t0) / 1_000_000;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith("/api/");
    }
}
