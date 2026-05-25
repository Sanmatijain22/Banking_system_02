package com.banking.handlers;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Serves the React production build from frontend/dist (SPA fallback to index.html).
 */
public class StaticFileHandler implements HttpHandler {

    private final Path distDir;
    private final Path legacyDir;

    public StaticFileHandler() {
        String root = System.getProperty("user.dir");
        this.distDir = Paths.get(root, "frontend", "dist").toAbsolutePath();
        // Legacy vanilla UI — only used if React build is missing
        this.legacyDir = Paths.get(root, "frontend", "public").toAbsolutePath();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }

        String path = exchange.getRequestURI().getPath();
        if (path.startsWith("/api")) {
            sendNotFound(exchange);
            return;
        }
        if ("/".equals(path) || path.isEmpty()) {
            path = "/index.html";
        }

        Path base = Files.isDirectory(distDir) ? distDir : legacyDir;
        Path requested = base.resolve(path.substring(1)).normalize();

        if (!requested.startsWith(base) || !Files.exists(requested) || Files.isDirectory(requested)) {
            Path index = base.resolve("index.html");
            if (Files.exists(index)) {
                requested = index;
            } else {
                sendNotFound(exchange);
                return;
            }
        }

        String contentType = contentTypeFor(requested.getFileName().toString());
        byte[] bytes = Files.readAllBytes(requested);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private void sendNotFound(HttpExchange exchange) throws IOException {
        String body = "Frontend not built. Run: cd frontend && npm install && npm run build";
        exchange.sendResponseHeaders(404, body.length());
        exchange.getResponseBody().write(body.getBytes());
        exchange.close();
    }

    private String contentTypeFor(String filename) {
        if (filename.endsWith(".html")) return "text/html; charset=UTF-8";
        if (filename.endsWith(".css")) return "text/css; charset=UTF-8";
        if (filename.endsWith(".js")) return "application/javascript; charset=UTF-8";
        if (filename.endsWith(".json")) return "application/json; charset=UTF-8";
        if (filename.endsWith(".svg")) return "image/svg+xml";
        if (filename.endsWith(".png")) return "image/png";
        if (filename.endsWith(".ico")) return "image/x-icon";
        if (filename.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }
}
