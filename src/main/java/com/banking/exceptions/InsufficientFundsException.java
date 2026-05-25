package com.banking.exceptions;

public class InsufficientFundsException extends BankingException {

    public InsufficientFundsException(String message) {
        super(message);
    }
}
