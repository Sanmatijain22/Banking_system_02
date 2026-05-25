package com.banking.handlers;

import com.banking.exceptions.BankingException;
import com.banking.models.Account;
import com.banking.services.AccountService;
import com.banking.utils.JsonUtils;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONObject;

import java.io.IOException;
import java.util.List;

public class AccountHandler extends BaseHandler {

    private final AccountService accountService;

    public AccountHandler(AccountService accountService) {
        this.accountService = accountService;
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

            if (path.equals("/api/accounts") && "POST".equals(method)) {
                handleCreate(exchange);
            } else if (path.equals("/api/accounts") && "GET".equals(method)) {
                handleListAll(exchange);
            } else if (path.startsWith("/api/accounts/") && "GET".equals(method)) {
                handleGetById(exchange, path);
            } else if (path.endsWith("/fraud-watch") && "PATCH".equals(method)) {
                handleFraudWatch(exchange, path);
            } else if (path.endsWith("/status") && "PATCH".equals(method)) {
                handleStatus(exchange, path);
            } else {
                sendError(exchange, 404, "Endpoint not found");
            }
        } catch (BankingException e) {
            sendError(exchange, e);
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    private void handleCreate(HttpExchange exchange) throws IOException, BankingException {
        JSONObject body = readJsonBody(exchange);
        String name = body.getString("name");
        String email = body.getString("email");
        double initialBalance = body.optDouble("initialBalance", 0);

        Account account = accountService.createAccount(name, email, initialBalance);
        JSONObject response = JsonUtils.successJson("Account created", JsonUtils.accountToJson(account));
        sendJson(exchange, 201, response);
    }

    private void handleListAll(HttpExchange exchange) throws IOException {
        List<Account> accounts = accountService.getAllAccounts();
        JSONObject response = new JSONObject();
        response.put("accounts", JsonUtils.accountsToJsonArray(accounts));
        response.put("count", accounts.size());
        sendJson(exchange, 200, response);
    }

    private void handleGetById(HttpExchange exchange, String path) throws IOException, BankingException {
        String accountId = path.substring("/api/accounts/".length());
        Account account = accountService.getAccount(accountId);
        sendJson(exchange, 200, JsonUtils.accountToJson(account));
    }

    private void handleFraudWatch(HttpExchange exchange, String path) throws IOException, BankingException {
        String accountId = path.replace("/api/accounts/", "").replace("/fraud-watch", "");
        JSONObject body = readJsonBody(exchange);
        Account account = accountService.setFraudWatch(accountId, body.getBoolean("enabled"));
        sendJson(exchange, 200, JsonUtils.accountToJson(account));
    }

    private void handleStatus(HttpExchange exchange, String path) throws IOException, BankingException {
        String accountId = path.replace("/api/accounts/", "").replace("/status", "");
        JSONObject body = readJsonBody(exchange);
        Account.Status status = Account.Status.valueOf(body.getString("status"));
        Account account = accountService.setStatus(accountId, status);
        sendJson(exchange, 200, JsonUtils.accountToJson(account));
    }
}
