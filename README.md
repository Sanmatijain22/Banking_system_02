# Banking & Wallet Management System

A **pure Core Java 17** banking application with an **AI-powered fraud detection** layer built on Anthropic Claude. No Spring Boot, no Hibernate — just `HttpServer`, `ConcurrentHashMap`, and clean service-oriented design.

## What Makes This Project Stand Out

> *"I integrated Claude AI for real-time fraud detection that analyzes transaction patterns, assigns risk scores, and automatically blocks suspicious accounts — built on raw Java without any frameworks to demonstrate core language mastery."*

After every deposit, withdrawal, or transfer, the system sends transaction context to Claude (`claude-sonnet-4-20250514`). Based on the AI response:

| Risk Score | Action |
|------------|--------|
| **> 80** | Account automatically **BLOCKED** |
| **50–80** | Fraud **alert** stored for REVIEW |
| **< 50** | Transaction allowed (LOW risk) |

A heuristic fallback runs when no API key is configured, so the app still works for demos and interviews.

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Language | Java 17 |
| HTTP Server | `com.sun.net.httpserver.HttpServer` |
| JSON | `org.json` (20231013) |
| AI | Anthropic Claude API |
| HTTP Client | `java.net.http.HttpClient` |
| Storage | In-memory `ConcurrentHashMap` |
| Build | Maven |

---

## Prerequisites

- **JDK 17+**
- **Maven 3.6+**
- *(Optional)* Anthropic API key for live AI fraud detection

---

## Setup & Run

### 1. Clone and build

```bash
cd banking-system
mvn clean package
```

### 2. Set your Claude API key (optional but recommended)

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-your-key-here"
```

**macOS / Linux:**
```bash
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

Alternatively, edit `ApiConfig.java` and replace `your-api-key-here` (not recommended for production).

### 3. Start the server

```bash
mvn exec:java -Dexec.mainClass="com.banking.Main"
```

Or run the shaded JAR:

```bash
java -jar target/banking-system-1.0.0.jar
```

The server starts on **http://localhost:8080** with an **empty database** — create accounts and transactions through the UI or API.

### 4. Open the React web UI

**Production (served by Java on port 8080):**

```bash
cd frontend && npm install && npm run build
cd .. && run.bat
```

Open **http://localhost:8080**

**Development (hot reload):**

```bash
# Terminal 1 — backend
java -cp "target/classes;lib/json-20231013.jar" com.banking.Main

# Terminal 2 — React dev server (proxies /api to :8080)
cd frontend && npm run dev
```

Open **http://localhost:5173**

The VaultAI dashboard includes Financial Control, Fraud Detection, Accounts, and Transactions with AI Vigilance toggles, auto-block, and real-time fraud scan.

---

## Project Structure

```
src/main/java/com/banking/
├── Main.java
├── BankingContext.java          # Service wiring
├── server/BankingServer.java
├── handlers/
│   ├── AccountHandler.java
│   ├── TransactionHandler.java
│   └── FraudHandler.java
├── services/
│   ├── AccountService.java
│   ├── TransactionService.java
│   └── FraudDetectionService.java   ← AI fraud detection
├── models/
│   ├── Account.java
│   ├── Transaction.java
│   └── FraudAlert.java
├── exceptions/                    # Custom hierarchy
└── utils/
    ├── JsonUtils.java
    └── ApiConfig.java
```

---

## REST API Endpoints

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/accounts` | Create account |
| `GET` | `/api/accounts` | List all accounts |
| `GET` | `/api/accounts/{id}` | Get account by ID |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/transactions/deposit` | Deposit funds |
| `POST` | `/api/transactions/withdraw` | Withdraw funds |
| `POST` | `/api/transactions/transfer` | Transfer between accounts |
| `GET` | `/api/transactions/{accountId}` | Transaction history |

### Fraud Detection (AI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/fraud/analyze` | Run on-demand fraud analysis |
| `GET` | `/api/fraud/alerts` | List all fraud alerts |

---

## Sample cURL Commands

> Replace `{accountId}` with IDs printed in the console on startup.

### List all accounts

```bash
curl http://localhost:8080/api/accounts
```

### Get account by ID

```bash
curl http://localhost:8080/api/accounts/{accountId}
```

### Create a new account

```bash
curl -X POST http://localhost:8080/api/accounts \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Jane Doe\",\"email\":\"jane@email.com\",\"initialBalance\":1000}"
```

### Deposit

```bash
curl -X POST http://localhost:8080/api/transactions/deposit \
  -H "Content-Type: application/json" \
  -d "{\"accountId\":\"{accountId}\",\"amount\":500}"
```

### Withdraw

```bash
curl -X POST http://localhost:8080/api/transactions/withdraw \
  -H "Content-Type: application/json" \
  -d "{\"accountId\":\"{accountId}\",\"amount\":100}"
```

### Transfer

```bash
curl -X POST http://localhost:8080/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -d "{\"fromAccountId\":\"{aliceId}\",\"toAccountId\":\"{bobId}\",\"amount\":250}"
```

### Transaction history

```bash
curl http://localhost:8080/api/transactions/{accountId}
```

### Trigger fraud analysis (on-demand)

```bash
curl -X POST http://localhost:8080/api/fraud/analyze \
  -H "Content-Type: application/json" \
  -d "{\"accountId\":\"{accountId}\",\"transactionId\":\"{transactionId}\"}"
```

### View fraud alerts

```bash
curl http://localhost:8080/api/fraud/alerts
```

### Trigger high-risk scenario (heuristic fallback without API key)

```bash
# Multiple large withdrawals in quick succession raise risk score
curl -X POST http://localhost:8080/api/transactions/withdraw \
  -H "Content-Type: application/json" \
  -d "{\"accountId\":\"{accountId}\",\"amount\":6000}"
```

---

## AI Fraud Detection — How It Works

1. **Trigger**: After every successful transaction, a background thread calls `FraudDetectionService`.
2. **Context sent to Claude**:
   - Current transaction (JSON)
   - Last 10 transactions for the account
   - Account age (hours) and current balance
   - Transaction count in the last 1 hour
3. **Claude responds** with structured JSON: `riskScore`, `riskLevel`, `isFraudulent`, `reasons`, `recommendation`.
4. **Automated actions**:
   - `riskScore > 80` → account status set to `BLOCKED`
   - `riskScore 50–80` → `FraudAlert` stored with `REVIEW` recommendation
5. **Fallback**: Without an API key, rule-based heuristics score large amounts and high frequency.

---

## Exception Hierarchy

```
BankingException (base)
├── InsufficientFundsException
├── AccountNotFoundException
├── AccountBlockedException
└── InvalidAmountException
```

HTTP mapping: `404` (not found), `403` (blocked), `400` (invalid amount / insufficient funds).

---

## Thread Safety

- All accounts and transactions stored in `ConcurrentHashMap`
- Balance updates use per-account `synchronized` locks
- Transfers lock accounts in consistent ID order to prevent deadlock
- Fraud alerts use `CopyOnWriteArrayList`

---

## License

MIT — built for learning and interview demonstrations.
