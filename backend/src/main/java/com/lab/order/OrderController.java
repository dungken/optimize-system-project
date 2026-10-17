package com.lab.order;

import com.lab.measure.MeasureFilter;
import com.lab.measure.PoolStats;
import com.lab.measure.QueryCounter;
import com.lab.order.dto.Meta;
import com.lab.order.dto.OrdersResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;
    private final PoolStats pool;

    public OrderController(OrderService service, PoolStats pool) {
        this.service = service;
        this.pool = pool;
    }

    @GetMapping
    public OrdersResponse list(
            HttpServletRequest req,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) String opt,
            @RequestParam(defaultValue = "false") boolean explain) {

        Set<String> opts = parseOpts(opt);
        OrderService.Result r = service.list(customerId, page, size, cursor, opts);

        // EXPLAIN chạy SAU, và các câu SQL của nó KHÔNG tính vào queryCount
        // (chụp số đếm lại trước khi gọi) — nếu không thì bật explain sẽ làm sai số đo.
        int queryCount = QueryCounter.get();
        var sqlGroups  = QueryCounter.grouped();
        String plan = explain ? service.explain(customerId, page, size) : null;

        String nextCursor = r.items().isEmpty() ? null
                : String.valueOf(r.items().getLast().id());

        Meta meta = new Meta(
                MeasureFilter.tookMs(req),
                r.dbMs(), r.mapMs(),
                queryCount,
                0,                       // frontend điền từ Content-Length
                java.util.List.copyOf(opts),
                sqlGroups,
                pool.snapshot(),
                plan);

        return new OrdersResponse(r.items(), nextCursor, meta);
    }

    private Set<String> parseOpts(String opt) {
        if (opt == null || opt.isBlank()) return Set.of();
        return Arrays.stream(opt.split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
