package com.banking.exceptions;

public class AccountNotFoundException extends BankingException {

    public AccountNotFoundException(String message) {
        super(message);
    }
}
