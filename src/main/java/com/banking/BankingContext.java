package com.banking;

import com.banking.services.AccountService;
import com.banking.services.AppSettings;
import com.banking.services.FraudDetectionService;
import com.banking.services.TransactionService;

/**
 * Wires services together and resolves the TransactionService ↔ FraudDetectionService cycle.
 */
public class BankingContext {

    private final AppSettings appSettings;
    private final AccountService accountService;
    private final FraudDetectionService fraudDetectionService;
    private final TransactionService transactionService;

    public BankingContext() {
        this.appSettings = new AppSettings();
        this.accountService = new AccountService();
        this.fraudDetectionService = new FraudDetectionService(accountService, appSettings);
        this.transactionService = new TransactionService(accountService, fraudDetectionService);
        this.fraudDetectionService.setTransactionService(transactionService);
    }

    public AppSettings getAppSettings() {
        return appSettings;
    }

    public AccountService getAccountService() {
        return accountService;
    }

    public TransactionService getTransactionService() {
        return transactionService;
    }

    public FraudDetectionService getFraudDetectionService() {
        return fraudDetectionService;
    }
}
