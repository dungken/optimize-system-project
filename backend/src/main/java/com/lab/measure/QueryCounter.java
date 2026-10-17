package com.lab.measure;

import org.hibernate.resource.jdbc.spi.StatementInspector;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Task 0.7 — đếm số câu SQL Hibernate gửi đi, theo từng request.
 *
 * Hibernate gọi inspect() cho MỌI câu SQL trước khi gửi xuống driver.
 * Đây là cách rẻ nhất để thấy N+1 bằng CON SỐ.
 *
 * Vì sao cần: thời gian không phải lúc nào cũng lộ ra N+1 (21 query nhanh
 * trên máy dev, chậm thảm trên mạng thật). Số query thì LUÔN lộ ra.
 *
 * Đăng ký trong application.yml:
 *   hibernate.session_factory.statement_inspector: com.lab.measure.QueryCounter
 * Hibernate tự tạo instance → phải có constructor rỗng, state phải static.
 */
public class QueryCounter implements StatementInspector {

    private static final ThreadLocal<AtomicInteger> COUNT =
            ThreadLocal.withInitial(AtomicInteger::new);

    @Override
    public String inspect(String sql) {
        COUNT.get().incrementAndGet();
        return sql;   // không sửa SQL, chỉ đếm
    }

    public static void reset() { COUNT.get().set(0); }

    public static int get()    { return COUNT.get().get(); }

    /** BẮT BUỘC gọi cuối request: Tomcat tái sử dụng thread → không clear sẽ rò rỉ. */
    public static void clear() { COUNT.remove(); }
}
