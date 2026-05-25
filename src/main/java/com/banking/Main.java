package com.banking;

import com.banking.server.BankingServer;

/**
 * Application entry point: starts with an empty store; all data comes from user/API input.
 */
public class Main {

    public static void main(String[] args) {
        try {
            BankingContext context = new BankingContext();
            System.out.println("[Startup] Empty database — create accounts via the UI or API.");

            BankingServer server = new BankingServer(context);
            server.start();

            Runtime.getRuntime().addShutdownHook(new Thread(server::stop));
        } catch (Exception e) {
            System.err.println("Failed to start banking server: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}
