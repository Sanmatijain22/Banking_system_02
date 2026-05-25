package com.banking.server;

import com.banking.BankingContext;
import com.banking.handlers.AccountHandler;
import com.banking.handlers.FraudHandler;
import com.banking.handlers.SettingsHandler;
import com.banking.handlers.StaticFileHandler;
import com.banking.handlers.TransactionHandler;
import com.banking.utils.ApiConfig;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

/**
 * Boots the embedded HttpServer and registers all REST route contexts.
 */
public class BankingServer {

    private final BankingContext context;
    private HttpServer server;

    public BankingServer(BankingContext context) {
        this.context = context;
    }

    public void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress(ApiConfig.SERVER_PORT), 0);

        server.createContext("/api/accounts", new AccountHandler(context.getAccountService()));
        server.createContext("/api/accounts/", new AccountHandler(context.getAccountService()));

        server.createContext("/api/transactions/deposit", new TransactionHandler(context.getTransactionService()));
        server.createContext("/api/transactions/withdraw", new TransactionHandler(context.getTransactionService()));
        server.createContext("/api/transactions/transfer", new TransactionHandler(context.getTransactionService()));
        server.createContext("/api/transactions/", new TransactionHandler(context.getTransactionService()));

        server.createContext("/api/fraud/analyze", new FraudHandler(context.getFraudDetectionService()));
        server.createContext("/api/fraud/alerts", new FraudHandler(context.getFraudDetectionService()));

        server.createContext("/api/settings", new SettingsHandler(context.getAppSettings()));

        server.createContext("/", new StaticFileHandler());

        server.setExecutor(Executors.newFixedThreadPool(10));
        server.start();

        System.out.println("========================================");
        System.out.println("  Banking & Wallet Management System");
        System.out.println("  API:  http://localhost:" + ApiConfig.SERVER_PORT + "/api/");
        System.out.println("  UI:   http://localhost:" + ApiConfig.SERVER_PORT);
        System.out.println("========================================");
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }
}
