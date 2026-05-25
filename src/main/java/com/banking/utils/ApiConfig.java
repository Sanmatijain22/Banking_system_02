package com.banking.utils;

/**
 * Central configuration for external API access.
 * Prefer environment variable so keys are never committed to source control.
 */
public final class ApiConfig {

    public static final String CLAUDE_API_KEY =
            System.getenv().getOrDefault("ANTHROPIC_API_KEY", "your-api-key-here");

    public static final String CLAUDE_MODEL = "claude-sonnet-4-20250514";
    public static final String CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
    public static final String ANTHROPIC_VERSION = "2023-06-01";

    public static final int SERVER_PORT = 8080;

    private ApiConfig() {
    }
}
