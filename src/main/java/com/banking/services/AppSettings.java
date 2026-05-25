package com.banking.services;

/**
 * In-memory global toggles controlled by the React dashboard.
 */
public class AppSettings {

    private volatile boolean aiVigilanceEnabled = true;
    private volatile boolean autoBlockEnabled = true;

    public boolean isAiVigilanceEnabled() {
        return aiVigilanceEnabled;
    }

    public void setAiVigilanceEnabled(boolean enabled) {
        this.aiVigilanceEnabled = enabled;
    }

    public boolean isAutoBlockEnabled() {
        return autoBlockEnabled;
    }

    public void setAutoBlockEnabled(boolean enabled) {
        this.autoBlockEnabled = enabled;
    }
}
