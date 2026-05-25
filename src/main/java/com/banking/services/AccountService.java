package com.banking.services;

import com.banking.exceptions.AccountNotFoundException;
import com.banking.exceptions.InvalidAmountException;
import com.banking.models.Account;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory account store.
 * All balance mutations happen in TransactionService, not here.
 */
public class AccountService {

    private final Map<String, Account> accounts = new ConcurrentHashMap<>();

    public Account createAccount(String name, String email, double initialBalance)
            throws InvalidAmountException {
        if (name == null || name.isBlank()) {
            throw new InvalidAmountException("Account name is required");
        }
        if (email == null || email.isBlank()) {
            throw new InvalidAmountException("Email is required");
        }
        if (initialBalance < 0) {
            throw new InvalidAmountException("Initial balance cannot be negative");
        }

        String accountId = UUID.randomUUID().toString();
        Account account = new Account(
                accountId,
                name.trim(),
                email.trim(),
                initialBalance,
                Instant.now(),
                Account.Status.ACTIVE
        );
        accounts.put(accountId, account);
        return account;
    }

    public Account getAccount(String accountId) throws AccountNotFoundException {
        Account account = accounts.get(accountId);
        if (account == null) {
            throw new AccountNotFoundException("Account not found: " + accountId);
        }
        return account;
    }

    public List<Account> getAllAccounts() {
        return new ArrayList<>(accounts.values());
    }

    /** Registers a pre-built account (e.g. migration); prefer createAccount for normal flow. */
    public void registerAccount(Account account) {
        accounts.put(account.getAccountId(), account);
    }

    public boolean accountExists(String accountId) {
        return accounts.containsKey(accountId);
    }

    public Account setFraudWatch(String accountId, boolean enabled) throws AccountNotFoundException {
        Account account = getAccount(accountId);
        account.setFraudWatchEnabled(enabled);
        return account;
    }

    public Account setStatus(String accountId, Account.Status status) throws AccountNotFoundException {
        Account account = getAccount(accountId);
        account.setStatus(status);
        return account;
    }
}
