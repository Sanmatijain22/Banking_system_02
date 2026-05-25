package com.banking.services;

import com.banking.exceptions.AccountBlockedException;
import com.banking.exceptions.AccountNotFoundException;
import com.banking.exceptions.BankingException;
import com.banking.exceptions.InsufficientFundsException;
import com.banking.exceptions.InvalidAmountException;
import com.banking.models.Account;
import com.banking.models.Transaction;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * Core transaction engine with synchronized balance updates.
 * Triggers async fraud analysis after every successful transaction.
 */
public class TransactionService {

    private final AccountService accountService;
    private final FraudDetectionService fraudDetectionService;

    /** Global transaction log keyed by transactionId. */
    private final Map<String, Transaction> transactions = new ConcurrentHashMap<>();

    /** Per-account history for fast fraud context lookups. */
    private final Map<String, CopyOnWriteArrayList<String>> accountTransactionIds = new ConcurrentHashMap<>();

    public TransactionService(AccountService accountService, FraudDetectionService fraudDetectionService) {
        this.accountService = accountService;
        this.fraudDetectionService = fraudDetectionService;
    }

    public Transaction deposit(String accountId, double amount) throws BankingException {
        validateAmount(amount);
        Account account = accountService.getAccount(accountId);
        ensureActive(account);

        synchronized (accountLock(accountId)) {
            account = accountService.getAccount(accountId);
            ensureActive(account);
            account.setBalance(account.getBalance() + amount);
            Transaction tx = recordTransaction(
                    Transaction.Type.DEPOSIT, amount, null, accountId, Transaction.Status.COMPLETED);
            triggerFraudCheck(accountId, tx);
            return tx;
        }
    }

    public Transaction withdraw(String accountId, double amount) throws BankingException {
        validateAmount(amount);
        Account account = accountService.getAccount(accountId);
        ensureActive(account);

        synchronized (accountLock(accountId)) {
            account = accountService.getAccount(accountId);
            ensureActive(account);
            if (account.getBalance() < amount) {
                throw new InsufficientFundsException(
                        "Insufficient funds. Balance: " + account.getBalance() + ", requested: " + amount);
            }
            account.setBalance(account.getBalance() - amount);
            Transaction tx = recordTransaction(
                    Transaction.Type.WITHDRAW, amount, accountId, null, Transaction.Status.COMPLETED);
            triggerFraudCheck(accountId, tx);
            return tx;
        }
    }

    public Transaction transfer(String fromAccountId, String toAccountId, double amount)
            throws BankingException {
        validateAmount(amount);
        if (fromAccountId.equals(toAccountId)) {
            throw new InvalidAmountException("Cannot transfer to the same account");
        }

        accountService.getAccount(fromAccountId);
        accountService.getAccount(toAccountId);

        // Lock ordering prevents deadlock when two transfers cross paths
        Object lock1 = accountLock(fromAccountId.compareTo(toAccountId) < 0 ? fromAccountId : toAccountId);
        Object lock2 = accountLock(fromAccountId.compareTo(toAccountId) < 0 ? toAccountId : fromAccountId);

        synchronized (lock1) {
            synchronized (lock2) {
                Account from = accountService.getAccount(fromAccountId);
                Account to = accountService.getAccount(toAccountId);
                ensureActive(from);
                ensureActive(to);

                if (from.getBalance() < amount) {
                    throw new InsufficientFundsException(
                            "Insufficient funds for transfer. Balance: " + from.getBalance());
                }

                from.setBalance(from.getBalance() - amount);
                to.setBalance(to.getBalance() + amount);

                Transaction tx = recordTransaction(
                        Transaction.Type.TRANSFER, amount, fromAccountId, toAccountId, Transaction.Status.COMPLETED);

                triggerFraudCheck(fromAccountId, tx);
                triggerFraudCheck(toAccountId, tx);
                return tx;
            }
        }
    }

    public List<Transaction> getTransactionHistory(String accountId) throws AccountNotFoundException {
        accountService.getAccount(accountId);
        CopyOnWriteArrayList<String> ids = accountTransactionIds.get(accountId);
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }

        return ids.stream()
                .map(transactions::get)
                .filter(tx -> tx != null)
                .sorted(Comparator.comparing(Transaction::getTimestamp).reversed())
                .collect(Collectors.toList());
    }

    public List<Transaction> getRecentTransactions(String accountId, int limit) {
        List<Transaction> history;
        try {
            history = getTransactionHistory(accountId);
        } catch (AccountNotFoundException e) {
            return Collections.emptyList();
        }
        return history.stream().limit(limit).collect(Collectors.toList());
    }

    public long countTransactionsInLastHour(String accountId) {
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        return getRecentTransactions(accountId, Integer.MAX_VALUE).stream()
                .filter(tx -> tx.getTimestamp().isAfter(oneHourAgo))
                .count();
    }

    /** Registers an existing transaction record (e.g. imports); does not trigger fraud re-check. */
    public void registerTransaction(Transaction transaction, String primaryAccountId) {
        transactions.put(transaction.getTransactionId(), transaction);
        accountTransactionIds
                .computeIfAbsent(primaryAccountId, k -> new CopyOnWriteArrayList<>())
                .add(transaction.getTransactionId());
        if (transaction.getFromAccount() != null && !transaction.getFromAccount().equals(primaryAccountId)) {
            accountTransactionIds
                    .computeIfAbsent(transaction.getFromAccount(), k -> new CopyOnWriteArrayList<>())
                    .add(transaction.getTransactionId());
        }
        if (transaction.getToAccount() != null && !transaction.getToAccount().equals(primaryAccountId)) {
            accountTransactionIds
                    .computeIfAbsent(transaction.getToAccount(), k -> new CopyOnWriteArrayList<>())
                    .add(transaction.getTransactionId());
        }
    }

    public Transaction getTransaction(String transactionId) throws AccountNotFoundException {
        Transaction tx = transactions.get(transactionId);
        if (tx == null) {
            throw new AccountNotFoundException("Transaction not found: " + transactionId);
        }
        return tx;
    }

    public List<Transaction> getAllTransactions() {
        return new ArrayList<>(transactions.values());
    }

    private Transaction recordTransaction(Transaction.Type type, double amount,
                                            String fromAccount, String toAccount,
                                            Transaction.Status status) {
        String txId = UUID.randomUUID().toString();
        Transaction tx = new Transaction(txId, type, amount, Instant.now(), status, fromAccount, toAccount);
        transactions.put(txId, tx);

        if (fromAccount != null) {
            accountTransactionIds
                    .computeIfAbsent(fromAccount, k -> new CopyOnWriteArrayList<>())
                    .add(txId);
        }
        if (toAccount != null) {
            accountTransactionIds
                    .computeIfAbsent(toAccount, k -> new CopyOnWriteArrayList<>())
                    .add(txId);
        }
        return tx;
    }

    private void validateAmount(double amount) throws InvalidAmountException {
        if (amount <= 0) {
            throw new InvalidAmountException("Amount must be greater than zero");
        }
    }

    private void ensureActive(Account account) throws AccountBlockedException {
        if (account.getStatus() == Account.Status.BLOCKED) {
            throw new AccountBlockedException("Account is blocked: " + account.getAccountId());
        }
    }

    /** Per-account lock objects so concurrent ops on different accounts don't block each other. */
    private final Map<String, Object> accountLocks = new ConcurrentHashMap<>();

    private Object accountLock(String accountId) {
        return accountLocks.computeIfAbsent(accountId, k -> new Object());
    }

    /** Runs fraud detection in background so HTTP response isn't delayed by AI latency. */
    private void triggerFraudCheck(String accountId, Transaction transaction) {
        Thread fraudThread = new Thread(() -> {
            try {
                fraudDetectionService.analyzeAfterTransaction(accountId, transaction);
            } catch (Exception e) {
                System.err.println("[FraudDetection] Analysis failed for account " + accountId + ": " + e.getMessage());
            }
        }, "fraud-check-" + transaction.getTransactionId());
        fraudThread.setDaemon(true);
        fraudThread.start();
    }
}
