package com.banking.services;

import com.banking.exceptions.AccountNotFoundException;
import com.banking.exceptions.BankingException;
import com.banking.models.Account;
import com.banking.models.FraudAlert;
import com.banking.models.Transaction;
import com.banking.utils.ApiConfig;
import com.banking.utils.JsonUtils;
import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI-powered fraud detection using Anthropic Claude.
 * Called automatically after each transaction and on-demand via REST.
 */
public class FraudDetectionService {

    private static final Pattern JSON_BLOCK_PATTERN =
            Pattern.compile("\\{[^{}]*\"riskScore\"[^{}]*\\}", Pattern.DOTALL);

    private final AccountService accountService;
    private final AppSettings appSettings;
    private TransactionService transactionService;
    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final CopyOnWriteArrayList<FraudAlert> fraudAlerts = new CopyOnWriteArrayList<>();

    public FraudDetectionService(AccountService accountService, AppSettings appSettings) {
        this.accountService = accountService;
        this.appSettings = appSettings;
    }

    /** Breaks circular dependency: TransactionService needs this service, which needs TransactionService. */
    public void setTransactionService(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    /**
     * Invoked after every successful transaction to score risk and act on thresholds.
     */
    public FraudAnalysisResult analyzeAfterTransaction(String accountId, Transaction transaction)
            throws BankingException {
        if (!appSettings.isAiVigilanceEnabled()) {
            return FraudAnalysisResult.safeDefault();
        }
        Account account = accountService.getAccount(accountId);
        if (!account.isFraudWatchEnabled()) {
            return FraudAnalysisResult.safeDefault();
        }
        List<Transaction> recent = transactionService.getRecentTransactions(accountId, 10);
        long frequency = transactionService.countTransactionsInLastHour(accountId);

        FraudAnalysisResult result = callClaudeApi(account, transaction, recent, frequency);
        applyRiskActions(accountId, transaction.getTransactionId(), result);
        return result;
    }

    /**
     * On-demand analysis for a specific transaction (manual fraud check endpoint).
     */
    public FraudAnalysisResult analyzeTransaction(String accountId, String transactionId)
            throws BankingException {
        if (!appSettings.isAiVigilanceEnabled()) {
            throw new BankingException("AI Vigilance is paused. Enable monitoring to run scans.");
        }
        Account account = accountService.getAccount(accountId);
        if (!account.isFraudWatchEnabled()) {
            throw new BankingException("Fraud watch is disabled for this account.");
        }
        Transaction transaction = transactionService.getTransaction(transactionId);
        List<Transaction> recent = transactionService.getRecentTransactions(accountId, 10);
        long frequency = transactionService.countTransactionsInLastHour(accountId);

        FraudAnalysisResult result = callClaudeApi(account, transaction, recent, frequency);
        applyRiskActions(accountId, transactionId, result);
        return result;
    }

    public List<FraudAlert> getAllFraudAlerts() {
        return new ArrayList<>(fraudAlerts);
    }

    private FraudAnalysisResult callClaudeApi(Account account, Transaction transaction,
                                              List<Transaction> recentHistory, long txCountLastHour)
            throws BankingException {
        JSONObject context = JsonUtils.buildFraudContext(account, transaction, recentHistory, txCountLastHour);
        String prompt = buildPrompt(context);

        if (ApiConfig.CLAUDE_API_KEY == null
                || ApiConfig.CLAUDE_API_KEY.isBlank()
                || "your-api-key-here".equals(ApiConfig.CLAUDE_API_KEY)) {
            System.out.println("[FraudDetection] No API key configured — using heuristic fallback.");
            return heuristicFallback(transaction, txCountLastHour);
        }

        try {
            JSONObject requestBody = new JSONObject();
            requestBody.put("model", ApiConfig.CLAUDE_MODEL);
            requestBody.put("max_tokens", 1024);
            requestBody.put("messages", new JSONArray()
                    .put(new JSONObject()
                            .put("role", "user")
                            .put("content", prompt)));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ApiConfig.CLAUDE_API_URL))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", ApiConfig.CLAUDE_API_KEY)
                    .header("anthropic-version", ApiConfig.ANTHROPIC_VERSION)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody.toString()))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.err.println("[FraudDetection] Claude API error " + response.statusCode() + ": " + response.body());
                return heuristicFallback(transaction, txCountLastHour);
            }

            return parseClaudeResponse(response.body());
        } catch (Exception e) {
            System.err.println("[FraudDetection] API call failed: " + e.getMessage());
            return heuristicFallback(transaction, txCountLastHour);
        }
    }

    private String buildPrompt(JSONObject context) {
        return """
                You are a banking fraud detection AI. Analyze this transaction and respond ONLY in this JSON format:
                {
                  "riskScore": (0-100),
                  "riskLevel": "LOW" or "MEDIUM" or "HIGH",
                  "isFraudulent": true or false,
                  "reasons": ["reason1", "reason2"],
                  "recommendation": "ALLOW" or "BLOCK" or "REVIEW"
                }
                Transaction: %s
                Recent history: %s
                Account context: %s
                """.formatted(
                context.getJSONObject("transaction").toString(2),
                context.getJSONArray("recentHistory").toString(2),
                new JSONObject()
                        .put("accountAgeHours", context.getDouble("accountAgeHours"))
                        .put("currentBalance", context.getDouble("currentBalance"))
                        .put("transactionsInLastHour", context.getLong("transactionsInLastHour"))
                        .put("accountStatus", context.getString("accountStatus"))
                        .toString(2));
    }

    private FraudAnalysisResult parseClaudeResponse(String responseBody) {
        try {
            JSONObject response = new JSONObject(responseBody);
            JSONArray content = response.getJSONArray("content");
            String text = content.getJSONObject(0).getString("text");

            JSONObject analysisJson = extractJsonFromText(text);
            return FraudAnalysisResult.fromJson(analysisJson);
        } catch (Exception e) {
            System.err.println("[FraudDetection] Failed to parse Claude response: " + e.getMessage());
            return FraudAnalysisResult.safeDefault();
        }
    }

    private JSONObject extractJsonFromText(String text) {
        Matcher matcher = JSON_BLOCK_PATTERN.matcher(text);
        if (matcher.find()) {
            return new JSONObject(matcher.group());
        }
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return new JSONObject(text.substring(start, end + 1));
        }
        throw new IllegalArgumentException("No JSON object found in Claude response");
    }

    /** Rule-based scoring when API is unavailable — keeps demo functional without a key. */
    private FraudAnalysisResult heuristicFallback(Transaction transaction, long txCountLastHour) {
        int riskScore = 10;
        List<String> reasons = new ArrayList<>();

        if (transaction.getAmount() > 100000) {
            riskScore += 40;
            reasons.add("Large transaction amount exceeds ₹1,00,000 threshold");
        }
        if (txCountLastHour > 5) {
            riskScore += 35;
            reasons.add("High transaction frequency: " + txCountLastHour + " in last hour");
        }
        if (transaction.getType() == Transaction.Type.WITHDRAW && transaction.getAmount() > 50000) {
            riskScore += 20;
            reasons.add("Large withdrawal above ₹50,000 detected");
        }

        riskScore = Math.min(riskScore, 100);
        String riskLevel = riskScore > 80 ? "HIGH" : riskScore >= 50 ? "MEDIUM" : "LOW";
        String recommendation = riskScore > 80 ? "BLOCK" : riskScore >= 50 ? "REVIEW" : "ALLOW";

        return new FraudAnalysisResult(
                riskScore,
                riskLevel,
                riskScore > 50,
                reasons.isEmpty() ? List.of("No significant risk indicators") : reasons,
                recommendation
        );
    }

    private void applyRiskActions(String accountId, String transactionId, FraudAnalysisResult result) {
        if (result.riskScore() > 80 && appSettings.isAutoBlockEnabled()) {
            try {
                Account account = accountService.getAccount(accountId);
                account.setStatus(Account.Status.BLOCKED);
                System.out.println("[FraudDetection] Account " + accountId + " BLOCKED (riskScore=" + result.riskScore() + ")");
            } catch (AccountNotFoundException ignored) {
            }
        }

        if (result.riskScore() >= 50) {
            FraudAlert alert = new FraudAlert(
                    UUID.randomUUID().toString(),
                    accountId,
                    transactionId,
                    result.riskScore(),
                    result.riskLevel(),
                    result.reasons(),
                    result.recommendation(),
                    Instant.now()
            );
            fraudAlerts.add(alert);
        }
    }

    public static class FraudAnalysisResult {
        private final int riskScore;
        private final String riskLevel;
        private final boolean fraudulent;
        private final List<String> reasons;
        private final String recommendation;

        public FraudAnalysisResult(int riskScore, String riskLevel, boolean fraudulent,
                                   List<String> reasons, String recommendation) {
            this.riskScore = riskScore;
            this.riskLevel = riskLevel;
            this.fraudulent = fraudulent;
            this.reasons = reasons;
            this.recommendation = recommendation;
        }

        public static FraudAnalysisResult fromJson(JSONObject json) {
            JSONArray reasonsArray = json.optJSONArray("reasons");
            List<String> reasons = new ArrayList<>();
            if (reasonsArray != null) {
                for (int i = 0; i < reasonsArray.length(); i++) {
                    reasons.add(reasonsArray.getString(i));
                }
            }

            return new FraudAnalysisResult(
                    json.getInt("riskScore"),
                    json.getString("riskLevel"),
                    json.optBoolean("isFraudulent", false),
                    reasons,
                    json.getString("recommendation")
            );
        }

        public static FraudAnalysisResult safeDefault() {
            return new FraudAnalysisResult(0, "LOW", false,
                    Collections.singletonList("Analysis unavailable"), "ALLOW");
        }

        public int riskScore() { return riskScore; }
        public String riskLevel() { return riskLevel; }
        public boolean fraudulent() { return fraudulent; }
        public List<String> reasons() { return reasons; }
        public String recommendation() { return recommendation; }

        public JSONObject toJson() {
            return new JSONObject()
                    .put("riskScore", riskScore)
                    .put("riskLevel", riskLevel)
                    .put("isFraudulent", fraudulent)
                    .put("reasons", new JSONArray(reasons))
                    .put("recommendation", recommendation);
        }
    }
}
