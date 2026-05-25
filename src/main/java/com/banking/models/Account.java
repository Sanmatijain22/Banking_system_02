package com.banking.models;

import java.time.Instant;

/**
 * Represents a bank account stored in memory.
 * Balance updates must go through TransactionService for thread safety.
 */
public class Account {

    public enum Status {
        ACTIVE, BLOCKED
    }

    private final String accountId;
    private final String name;
    private final String email;
    private volatile double balance;
    private final Instant createdAt;
    private volatile Status status;
    private volatile boolean fraudWatchEnabled;

    public Account(String accountId, String name, String email, double balance, Instant createdAt, Status status) {
        this(accountId, name, email, balance, createdAt, status, true);
    }

    public Account(String accountId, String name, String email, double balance, Instant createdAt,
                   Status status, boolean fraudWatchEnabled) {
        this.accountId = accountId;
        this.name = name;
        this.email = email;
        this.balance = balance;
        this.createdAt = createdAt;
        this.status = status;
        this.fraudWatchEnabled = fraudWatchEnabled;
    }

    public String getAccountId() {
        return accountId;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public double getBalance() {
        return balance;
    }

    public void setBalance(double balance) {
        this.balance = balance;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public boolean isFraudWatchEnabled() {
        return fraudWatchEnabled;
    }

    public void setFraudWatchEnabled(boolean fraudWatchEnabled) {
        this.fraudWatchEnabled = fraudWatchEnabled;
    }
}
