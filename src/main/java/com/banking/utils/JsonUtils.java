package com.banking.utils;

import com.banking.models.Account;
import com.banking.models.FraudAlert;
import com.banking.models.Transaction;
import org.json.JSONArray;
import org.json.JSONObject;

import java.time.Instant;
import java.util.List;

/**
 * Converts domain objects to org.json structures for HTTP responses.
 * Keeps handlers free of repetitive JSON boilerplate.
 */
public final class JsonUtils {

    private JsonUtils() {
    }

    public static JSONObject accountToJson(Account account) {
        JSONObject json = new JSONObject();
        json.put("accountId", account.getAccountId());
        json.put("name", account.getName());
        json.put("email", account.getEmail());
        json.put("balance", account.getBalance());
        json.put("createdAt", account.getCreatedAt().toString());
        json.put("status", account.getStatus().name());
        json.put("fraudWatchEnabled", account.isFraudWatchEnabled());
        return json;
    }

    public static JSONObject transactionToJson(Transaction tx) {
        JSONObject json = new JSONObject();
        json.put("transactionId", tx.getTransactionId());
        json.put("type", tx.getType().name());
        json.put("amount", tx.getAmount());
        json.put("timestamp", tx.getTimestamp().toString());
        json.put("status", tx.getStatus().name());
        if (tx.getFromAccount() != null) {
            json.put("fromAccount", tx.getFromAccount());
        }
        if (tx.getToAccount() != null) {
            json.put("toAccount", tx.getToAccount());
        }
        return json;
    }

    public static JSONObject fraudAlertToJson(FraudAlert alert) {
        JSONObject json = new JSONObject();
        json.put("alertId", alert.getAlertId());
        json.put("accountId", alert.getAccountId());
        json.put("transactionId", alert.getTransactionId());
        json.put("riskScore", alert.getRiskScore());
        json.put("riskLevel", alert.getRiskLevel());
        json.put("reasons", new JSONArray(alert.getReasons()));
        json.put("recommendation", alert.getRecommendation());
        json.put("timestamp", alert.getTimestamp().toString());
        return json;
    }

    public static JSONArray accountsToJsonArray(List<Account> accounts) {
        JSONArray array = new JSONArray();
        for (Account account : accounts) {
            array.put(accountToJson(account));
        }
        return array;
    }

    public static JSONArray transactionsToJsonArray(List<Transaction> transactions) {
        JSONArray array = new JSONArray();
        for (Transaction tx : transactions) {
            array.put(transactionToJson(tx));
        }
        return array;
    }

    public static JSONArray fraudAlertsToJsonArray(List<FraudAlert> alerts) {
        JSONArray array = new JSONArray();
        for (FraudAlert alert : alerts) {
            array.put(fraudAlertToJson(alert));
        }
        return array;
    }

    public static JSONObject errorJson(String message) {
        return new JSONObject().put("error", message);
    }

    public static JSONObject successJson(String message, JSONObject data) {
        JSONObject json = new JSONObject();
        json.put("message", message);
        if (data != null) {
            json.put("data", data);
        }
        return json;
    }

    /** Builds fraud-analysis context payload sent to Claude. */
    public static JSONObject buildFraudContext(Account account, Transaction transaction,
                                               List<Transaction> recentHistory, long txCountLastHour) {
        JSONObject context = new JSONObject();
        context.put("transaction", transactionToJson(transaction));
        context.put("recentHistory", transactionsToJsonArray(recentHistory));
        context.put("accountAgeHours",
                (Instant.now().toEpochMilli() - account.getCreatedAt().toEpochMilli()) / (1000.0 * 60 * 60));
        context.put("currentBalance", account.getBalance());
        context.put("transactionsInLastHour", txCountLastHour);
        context.put("accountStatus", account.getStatus().name());
        return context;
    }
}
