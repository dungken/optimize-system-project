package com.lab.measure;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

/**
 * Trạng thái connection pool — vòng 5 cần.
 * `pending > 0` là dấu hiệu RÕ NHẤT của nghẽn DB: thread đang xếp hàng chờ connection.
 */
@Component
public class PoolStats {

    private final HikariDataSource ds;

    public PoolStats(DataSource dataSource) {
        this.ds = dataSource instanceof HikariDataSource h ? h : null;
    }

    public Snapshot snapshot() {
        if (ds == null || ds.getHikariPoolMXBean() == null) return new Snapshot(0, 0, 0, 0);
        var p = ds.getHikariPoolMXBean();
        return new Snapshot(
                p.getActiveConnections(),
                p.getIdleConnections(),
                p.getThreadsAwaitingConnection(),
                ds.getMaximumPoolSize());
    }

    public record Snapshot(int active, int idle, int pending, int max) {}
}
