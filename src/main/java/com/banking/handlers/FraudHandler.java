package com.banking.handlers;

import com.banking.exceptions.BankingException;
import com.banking.models.FraudAlert;
import com.banking.services.FraudDetectionService;
import com.banking.services.FraudDetectionService.FraudAnalysisResult;
import com.banking.utils.JsonUtils;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;

public class FraudHandler extends BaseHandler {

    private final FraudDetectionService fraudDetectionService;

    public FraudHandler(FraudDetectionService fraudDetectionService) {
        this.fraudDetectionService = fraudDetectionService;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            handleOptions(exchange);
            return;
        }

        try {
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();

            if ("/api/fraud/analyze".equals(path) && "POST".equals(method)) {
                handleAnalyze(exchange);
            } else if ("/api/fraud/alerts".equals(path) && "GET".equals(method)) {
                handleAlerts(exchange);
            } else {
                sendError(exchange, 404, "Endpoint not found");
            }
        } catch (BankingException e) {
            sendError(exchange, e);
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    private void handleAnalyze(HttpExchange exchange) throws IOException, BankingException {
        JSONObject body = readJsonBody(exchange);
        String accountId = body.getString("accountId");
        String transactionId = body.getString("transactionId");

        FraudAnalysisResult result = fraudDetectionService.analyzeTransaction(accountId, transactionId);
        JSONObject response = JsonUtils.successJson("Fraud analysis complete", result.toJson());
        sendJson(exchange, 200, response);
    }

    private void handleAlerts(HttpExchange exchange) throws IOException {
        List<FraudAlert> alerts = fraudDetectionService.getAllFraudAlerts();
        JSONObject response = new JSONObject();
        response.put("alerts", JsonUtils.fraudAlertsToJsonArray(alerts));
        response.put("count", alerts.size());
        sendJson(exchange, 200, response);
    }
}
