package com.lab.order.dto;

import com.lab.measure.QueryCounter;
import com.lab.measure.PoolStats;

import java.util.List;

/**
 * Số liệu hiện lên dashboard. Hợp đồng với frontend (api.ts).
 *
 * Phân tách thời gian:  tookMs = dbMs + mapMs + (phần còn lại của framework)
 *   dbMs  — thời gian trong repository (truy vấn)
 *   mapMs — thời gian map entity sang DTO  ← N+1 nằm ở ĐÂY, không phải dbMs,
 *           vì lazy load kích hoạt lúc đọc getCustomer()
 *
 * bytes = 0 từ server (chưa serialize xong), frontend điền từ Content-Length.
 */
public record Meta(
        long                      tookMs,
        long                      dbMs,
        long                      mapMs,
        int                       queryCount,
        long                      bytes,
        List<String>              optsOn,
        List<QueryCounter.Group>  sql,       // SQL đã gom nhóm kèm số lần
        PoolStats.Snapshot        pool,
        String                    explain    // null trừ khi ?explain=true
) {}
