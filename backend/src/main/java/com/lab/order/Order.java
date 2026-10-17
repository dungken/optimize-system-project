package com.lab.order;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    private Long id;

    /**
     * LAZY là mặc định đúng cho ManyToOne? KHÔNG — mặc định của JPA là EAGER.
     * Đặt LAZY tường minh để vòng 2 có N+1 thật: mỗi lần đọc getCustomer().getName()
     * sinh thêm một câu SELECT.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @Column(name = "amount_cents")
    private long amountCents;

    private short status;          // 0 PENDING  1 PAID  2 CANCELLED
    private String note;           // cột nặng — vòng 4 dùng

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    public Long getId()               { return id; }
    public Customer getCustomer()     { return customer; }
    public long getAmountCents()      { return amountCents; }
    public short getStatus()          { return status; }
    public String getNote()           { return note; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
