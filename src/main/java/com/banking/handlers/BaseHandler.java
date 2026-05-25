package com.banking.handlers;

import com.banking.exceptions.AccountBlockedException;
import com.banking.exceptions.AccountNotFoundException;
import com.banking.exceptions.BankingException;
import com.banking.exceptions.InsufficientFundsException;
import com.banking.exceptions.InvalidAmountException;
import com.banking.utils.JsonUtils;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Shared HTTP utilities: CORS headers, JSON read/write, exception-to-status mapping.
 */
public abstract class BaseHandler implements HttpHandler {

    protected void sendJson(HttpExchange exchange, int statusCode, JSONObject body) throws IOException {
        byte[] bytes = body.toString(2).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        addCorsHeaders(exchange);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    protected void sendError(HttpExchange exchange, BankingException ex) throws IOException {
        int status = mapExceptionToStatus(ex);
        sendJson(exchange, status, JsonUtils.errorJson(ex.getMessage()));
    }

    protected void sendError(HttpExchange exchange, int status, String message) throws IOException {
        sendJson(exchange, status, JsonUtils.errorJson(message));
    }

    protected JSONObject readJsonBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            if (body.isBlank()) {
                return new JSONObject();
            }
            return new JSONObject(body);
        }
    }

    protected String extractPathParam(String path, String prefix) {
        if (path.startsWith(prefix)) {
            String remainder = path.substring(prefix.length());
            if (remainder.startsWith("/")) {
                remainder = remainder.substring(1);
            }
            int slash = remainder.indexOf('/');
            return slash >= 0 ? remainder.substring(0, slash) : remainder;
        }
        return null;
    }

    protected void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    protected void handleOptions(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);
        exchange.sendResponseHeaders(204, -1);
        exchange.close();
    }

    private int mapExceptionToStatus(BankingException ex) {
        if (ex instanceof AccountNotFoundException) {
            return 404;
        }
        if (ex instanceof AccountBlockedException) {
            return 403;
        }
        if (ex instanceof InsufficientFundsException || ex instanceof InvalidAmountException) {
            return 400;
        }
        return 500;
    }
}
