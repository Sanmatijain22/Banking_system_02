package com.banking.models;

import java.time.Instant;

/**
 * Immutable record of a money movement.
 * fromAccount / toAccount may be null for deposit / withdraw respectively.
 */
public class Transaction {

    public enum Type {
        DEPOSIT, WITHDRAW, TRANSFER
    }

    public enum Status {
        COMPLETED, FAILED
    }

    private final String transactionId;
    private final Type type;
    private final double amount;
    private final Instant timestamp;
    private final Status status;
    private final String fromAccount;
    private final String toAccount;

    public Transaction(String transactionId, Type type, double amount, Instant timestamp,
                       Status status, String fromAccount, String toAccount) {
        this.transactionId = transactionId;
        this.type = type;
        this.amount = amount;
        this.timestamp = timestamp;
        this.status = status;
        this.fromAccount = fromAccount;
        this.toAccount = toAccount;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public Type getType() {
        return type;
    }

    public double getAmount() {
        return amount;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public Status getStatus() {
        return status;
    }

    public String getFromAccount() {
        return fromAccount;
    }

    public String getToAccount() {
        return toAccount;
    }
}
