package com.banking.exceptions;

/**
 * Base exception for all banking-domain errors.
 * Handlers map subclasses to specific HTTP status codes.
 */
public class BankingException extends Exception {

    public BankingException(String message) {
        super(message);
    }

    public BankingException(String message, Throwable cause) {
        super(message, cause);
    }
}
