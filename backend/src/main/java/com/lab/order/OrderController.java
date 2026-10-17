package com.lab.order;

import com.lab.measure.MeasureFilter;
import com.lab.measure.QueryCounter;
import com.lab.order.dto.Meta;
import com.lab.order.dto.OrderItem;
import com.lab.order.dto.OrdersResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public OrdersResponse list(
            HttpServletRequest req,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0")   int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) String opt) {

        Set<String> opts = parseOpts(opt);

        List<OrderItem> items = service.list(customerId, page, size, cursor, opts);

        // nextCursor = id của dòng cuối. null khi hết trang (hợp đồng với frontend).
        String nextCursor = items.isEmpty() ? null : String.valueOf(items.getLast().id());

        // Đọc SAU khi service xong: gồm thời gian DB + mapping, chưa gồm serialize JSON.
        Meta meta = new Meta(
                MeasureFilter.tookMs(req),
                QueryCounter.get(),
                0,                               // frontend điền từ Content-Length
                List.copyOf(opts));

        return new OrdersResponse(items, nextCursor, meta);
    }

    private Set<String> parseOpts(String opt) {
        if (opt == null || opt.isBlank()) return Set.of();
        return Arrays.stream(opt.split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
    }
}
