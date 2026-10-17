package com.lab.measure;

import org.hibernate.resource.jdbc.spi.StatementInspector;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Đếm VÀ thu lại SQL Hibernate gửi đi, theo từng request.
 *
 * Thu cả câu lệnh (không chỉ đếm) để UI hiện được:
 *   "SELECT ... FROM customers WHERE id=?   × 100"
 * Nhìn 100 câu GIỐNG HỆT NHAU là hiểu N+1 ngay, nhanh hơn mọi lời giải thích.
 */
public class QueryCounter implements StatementInspector {

    private static final int CAP = 300;   // chặn rò RAM nếu có truy vấn điên rồ

    private static final ThreadLocal<List<String>> SQLS =
            ThreadLocal.withInitial(ArrayList::new);

    @Override
    public String inspect(String sql) {
        List<String> list = SQLS.get();
        if (list.size() < CAP) list.add(sql);
        else if (list.size() == CAP) list.add("… (cắt ở " + CAP + " câu)");
        return sql;
    }

    public static void reset() { SQLS.get().clear(); }
    public static int get()    { return SQLS.get().size(); }
    public static void clear() { SQLS.remove(); }

    /** Gom câu giống nhau lại kèm số lần — đây là thứ hiện lên UI. */
    public static List<Group> grouped() {
        Map<String, Integer> m = new LinkedHashMap<>();
        for (String s : SQLS.get()) m.merge(normalize(s), 1, Integer::sum);
        return m.entrySet().stream().map(e -> new Group(e.getKey(), e.getValue())).toList();
    }

    /** Bỏ alias sinh tự động (a1_0, c1_0…) để câu giống nhau gom được vào một nhóm. */
    private static String normalize(String sql) {
        return sql.replaceAll("\\b[a-z]\\d+_\\d+\\b", "x").replaceAll("\\s+", " ").trim();
    }

    public record Group(String sql, int count) {}
}
