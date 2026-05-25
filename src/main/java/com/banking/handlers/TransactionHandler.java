package com.banking.handlers;

import com.banking.exceptions.BankingException;
import com.banking.models.Transaction;
import com.banking.services.TransactionService;
import com.banking.utils.JsonUtils;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;

public class TransactionHandler extends BaseHandler {

    private final TransactionService transactionService;

    public TransactionHandler(TransactionService transactionService) {
        this.transactionService = transactionService;
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

            switch (path) {
                case "/api/transactions/deposit" -> {
                    if ("POST".equals(method)) handleDeposit(exchange);
                    else notFound(exchange);
                }
                case "/api/transactions/withdraw" -> {
                    if ("POST".equals(method)) handleWithdraw(exchange);
                    else notFound(exchange);
                }
                case "/api/transactions/transfer" -> {
                    if ("POST".equals(method)) handleTransfer(exchange);
                    else notFound(exchange);
                }
                default -> {
                    if (path.startsWith("/api/transactions/") && "GET".equals(method)) {
                        handleHistory(exchange, path);
                    } else {
                        notFound(exchange);
                    }
                }
            }
        } catch (BankingException e) {
            sendError(exchange, e);
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    private void handleDeposit(HttpExchange exchange) throws IOException, BankingException {
        JSONObject body = readJsonBody(exchange);
        Transaction tx = transactionService.deposit(
                body.getString("accountId"),
                body.getDouble("amount"));
        sendJson(exchange, 200, JsonUtils.successJson("Deposit successful", JsonUtils.transactionToJson(tx)));
    }

    private void handleWithdraw(HttpExchange exchange) throws IOException, BankingException {
        JSONObject body = readJsonBody(exchange);
        Transaction tx = transactionService.withdraw(
                body.getString("accountId"),
                body.getDouble("amount"));
        sendJson(exchange, 200, JsonUtils.successJson("Withdrawal successful", JsonUtils.transactionToJson(tx)));
    }

    private void handleTransfer(HttpExchange exchange) throws IOException, BankingException {
        JSONObject body = readJsonBody(exchange);
        Transaction tx = transactionService.transfer(
                body.getString("fromAccountId"),
                body.getString("toAccountId"),
                body.getDouble("amount"));
        sendJson(exchange, 200, JsonUtils.successJson("Transfer successful", JsonUtils.transactionToJson(tx)));
    }

    private void handleHistory(HttpExchange exchange, String path) throws IOException, BankingException {
        String accountId = path.substring("/api/transactions/".length());
        List<Transaction> history = transactionService.getTransactionHistory(accountId);
        JSONObject response = new JSONObject();
        response.put("accountId", accountId);
        response.put("transactions", JsonUtils.transactionsToJsonArray(history));
        response.put("count", history.size());
        sendJson(exchange, 200, response);
    }

    private void notFound(HttpExchange exchange) throws IOException {
        sendError(exchange, 404, "Endpoint not found");
    }
}
