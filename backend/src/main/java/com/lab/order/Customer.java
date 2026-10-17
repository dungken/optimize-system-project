package com.lab.order;

import jakarta.persistence.*;

@Entity
@Table(name = "customers")
public class Customer {
    @Id
    private Long id;
    private String name;
    private String city;

    public Long getId()     { return id; }
    public String getName() { return name; }
    public String getCity() { return city; }
}
