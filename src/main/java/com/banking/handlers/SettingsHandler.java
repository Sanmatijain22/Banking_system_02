package com.banking.handlers;

import com.banking.services.AppSettings;
import com.sun.net.httpserver.HttpExchange;
import org.json.JSONObject;

import java.io.IOException;

public class SettingsHandler extends BaseHandler {

    private final AppSettings appSettings;

    public SettingsHandler(AppSettings appSettings) {
        this.appSettings = appSettings;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            handleOptions(exchange);
            return;
        }

        try {
            String method = exchange.getRequestMethod();
            if ("GET".equals(method)) {
                sendJson(exchange, 200, toJson());
            } else if ("PATCH".equals(method)) {
                JSONObject body = readJsonBody(exchange);
                if (body.has("aiVigilanceEnabled")) {
                    appSettings.setAiVigilanceEnabled(body.getBoolean("aiVigilanceEnabled"));
                }
                if (body.has("autoBlockEnabled")) {
                    appSettings.setAutoBlockEnabled(body.getBoolean("autoBlockEnabled"));
                }
                sendJson(exchange, 200, toJson());
            } else {
                sendError(exchange, 405, "Method not allowed");
            }
        } catch (Exception e) {
            sendError(exchange, 500, "Internal server error: " + e.getMessage());
        }
    }

    private JSONObject toJson() {
        return new JSONObject()
                .put("aiVigilanceEnabled", appSettings.isAiVigilanceEnabled())
                .put("autoBlockEnabled", appSettings.isAutoBlockEnabled());
    }
}
