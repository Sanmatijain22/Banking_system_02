package com.banking.exceptions;

public class InvalidAmountException extends BankingException {

    public InvalidAmountException(String message) {
        super(message);
    }
}
