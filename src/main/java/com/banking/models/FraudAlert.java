package com.banking.models;

import java.time.Instant;
import java.util.List;

/**
 * Persisted result of an AI fraud analysis for audit and review.
 */
public class FraudAlert {

    private final String alertId;
    private final String accountId;
    private final String transactionId;
    private final int riskScore;
    private final String riskLevel;
    private final List<String> reasons;
    private final String recommendation;
    private final Instant timestamp;

    public FraudAlert(String alertId, String accountId, String transactionId, int riskScore,
                      String riskLevel, List<String> reasons, String recommendation, Instant timestamp) {
        this.alertId = alertId;
        this.accountId = accountId;
        this.transactionId = transactionId;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.reasons = reasons;
        this.recommendation = recommendation;
        this.timestamp = timestamp;
    }

    public String getAlertId() {
        return alertId;
    }

    public String getAccountId() {
        return accountId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public int getRiskScore() {
        return riskScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public List<String> getReasons() {
        return reasons;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public Instant getTimestamp() {
        return timestamp;
    }
}
