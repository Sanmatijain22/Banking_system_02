package com.banking.utils;

/**
 * Central configuration for external API access.
 * Prefer environment variable so keys are never committed to source control.
 */
public final class ApiConfig {

    public static final String GROQ_API_KEY =
            System.getenv().getOrDefault("GROQ_API_KEY", "your-groq-key-here");

    public static final String GROQ_MODEL =
            System.getenv().getOrDefault("GROQ_MODEL", "llama-3.3-70b-specdec");

    public static final String GROQ_API_URL =
            System.getenv().getOrDefault("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions");

    public static final int SERVER_PORT = 8080;

    private ApiConfig() {
    }
}
