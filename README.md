# 🛡️ FraudGuard

> High-throughput, sub-100ms financial fraud intelligence & compliance adjudication platform.

[![CI](https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection/actions/workflows/ci.yml/badge.svg)](https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection/actions/workflows/ci.yml)
![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2.5-6DB33F?style=flat&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)
![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-7.4-231F20?style=flat&logo=apachekafka&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 1. Overview

**FraudGuard** is an enterprise-grade fintech risk engine engineered to evaluate high-volume payment transactions against 20 behavioral, biometric, velocity, and network heuristics in under 100 milliseconds. Built for modern payment service providers and compliance analysts, FraudGuard unifies atomic checkout decisioning, asynchronous event-driven audit streaming, and an interactive analyst workbench. By correlating real-time Redis sliding windows, device fingerprinting, and external intelligence, it stops syndicate attacks and card-testing rings while keeping legitimate customer friction near zero.

---

## 2. Architecture

```
                                  +-------------------------------------------------------------+
                                  |                     CLIENT LAYER                            |
                                  |   [ Customer Portal ]               [ Analyst Cockpit ]     |
                                  |    (Checkout / MyTxns)               (Triage & SSE Stream)  |
                                  +------------------------------+------------------------------+
                                                                 | HTTPS / JWT
                                                                 v
                                  +-------------------------------------------------------------+
                                  |                   API & REVERSE PROXY                       |
                                  |                     Nginx (Port 80)                         |
                                  +------------------------------+------------------------------+
                                                                 |
                                                                 v
+-------------------------------------------------------------------------------------------------------------------------+
|                                              SPRING BOOT APPLICATION LAYER                                              |
|                                                                                                                         |
|   +-----------------------+     +-----------------------+     +-----------------------+     +-----------------------+   |
|   |   Security Filter     | --> |   Checkout Controller | --> |  Enrichment Engine    | --> |   Fraud Risk Engine   |   |
|   |   (Stateless JWT)     |     |   (Validation & SLA)  |     |  (GeoIP, IPQS, Device)|     |   (20 Rules Evaluator)|   |
|   +-----------------------+     +-----------------------+     +-----------------------+     +-----------------------+   |
|                                                                                                         |               |
|                                                                                                         v               |
|   +-----------------------------------------------------------------------------------------------------------------+   |
|   |                                          ADJUDICATION & AUDIT ORCHESTRATION                                     |   |
|   |   - Atomic Transaction Persistence (PostgreSQL)                                                                 |   |
|   |   - Instant Decision Generation (APPROVED | PENDING_REVIEW | BLOCKED)                                           |   |
|   |   - Async Event Publishing (Kafka Producer with Snappy & Idempotence)                                           |   |
|   +-----------------------------------------------------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------------------------------------------------+
                     |                                           |                                           |
                     v                                           v                                           v
       +---------------------------+               +---------------------------+               +---------------------------+
       |       PostgreSQL 16       |               |          Redis 7          |               |       Apache Kafka        |
       |  - Transactions & Audits  |               |  - Sliding-Window Limits  |               |  - fraudguard.txn.raw     |
       |  - Flyway Migrations (V3) |               |  - Blacklist Fast Cache   |               |  - fraudguard.txn.decided |
       |  - Strict Referential FKs |               |  - Rule Parameters (O(1)) |               |  - fraudguard.audit.events|
       +---------------------------+               +---------------------------+               +---------------------------+
                     ^                                                                                       |
                     |                                                                                       v
                     +=========================== Kafka Event Consumers =====================================+
                                                  (Manual Immediate Ack, Deduplication, SSE Emitters)
```

---

## 3. Tech Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Backend Framework** | Java 17 / Spring Boot 3.2.5 | Reactive validation, JPA 3.1, asynchronous pipelines |
| **Database** | PostgreSQL 16 + Flyway | Schema versioning (`V1-V3`), index tuning, multi-table transactions |
| **Caching & Velocity** | Redis 7 (Alpine) | Sorted sets (`ZADD`/`ZREMRANGEBYSCORE`), atomic counters, LRU eviction |
| **Event Streaming** | Apache Kafka 7.4 (Confluent) | Multi-partition topics, DLT error routing, manual offset commits |
| **Frontend Platform** | React 18 + Vite 5 | SPA routing, dark theme, micro-animations, Tailwind CSS |
| **Visualizations** | Recharts 2.12 | Semicircular score gauges, dynamic risk point breakdowns |
| **Device Biometrics** | FingerprintJS + Custom Hooks | Keystroke rhythm variance, mousemove counters, clipboard tracking |
| **Authentication** | Stateless JWT (JJWT 0.12) | HMAC-SHA256 bearer tokens with RBAC route security |
| **Containerization** | Docker & Docker Compose v3.9 | Multi-stage hardened alpine containers, automated health checks |
| **Continuous Integration** | GitHub Actions | Parallel verification of Maven test suites and Vite production bundle |

---

## 4. Risk Scoring Engine (20 Rules)

The engine evaluates each transaction against active rules stored in database cache. Violations increment the composite score (clamped between 0 and 100). Transactions with score $\ge 70$ or hit blacklists are **BLOCKED**; scores $30-69$ enter **PENDING_REVIEW**; scores $< 30$ are automatically **APPROVED**.

| Rule Code | Monitored Risk Signal | Weight | Default Threshold |
| :--- | :--- | :---: | :--- |
| `IP_GEO_HIGH_RISK` | High-risk geolocation origin | +40 pts | RU, NG, BY, KP, IR |
| `IP_IS_VPN` | Commercial VPN anonymizer | +25 pts | True |
| `IP_IS_TOR` | Tor network exit node relay | +40 pts | True |
| `IP_IS_PROXY` | Public or residential proxy | +25 pts | True |
| `IP_IS_HOSTING` | Datacenter or cloud hosting IP | +20 pts | True |
| `IP_RISK_SCORE_HIGH` | External IPQS threat score | +30 pts | IPQS Score $\ge 75$ |
| `VELOCITY_CARD_1M` | Card 1-minute velocity burst | +35 pts | $> 2$ transactions / min |
| `VELOCITY_CARD_1H` | Card 1-hour velocity accumulation | +25 pts | $> 5$ transactions / hour |
| `VELOCITY_CARD_24H` | Card 24-hour total transactions | +20 pts | $> 10$ transactions / 24 hr |
| `VELOCITY_IP_1H` | Single IP rapid velocity surge | +30 pts | $> 5$ transactions / hour |
| `VELOCITY_DEVICE_24H` | Device ID rapid cycling | +25 pts | $> 4$ accounts / 24 hr |
| `TIME_ON_PAGE_TOO_FAST` | Automated bot page interaction duration | +20 pts | $< 2,000$ ms on checkout |
| `CLIPBOARD_PASTE_DETECTED` | Automated clipboard payment injection | +15 pts | Paste detected on input |
| `BROWSER_TIMEZONE_MISMATCH` | Browser vs. IP timezone discrepancy | +15 pts | Offset difference $> 120$ min |
| `HEADLESS_BROWSER_DETECTED` | Headless Chrome or Selenium driver | +35 pts | `navigator.webdriver` = true |
| `KEYSTROKE_ZERO_VARIANCE` | Non-human mechanical keystroke gaps | +20 pts | Standard deviation $< 10$ ms |
| `HIGH_TRANSACTION_AMOUNT` | Elevated financial ticket value | +40 pts | Amount $> \$2,000.00$ |
| `NEW_DEVICE_FIRST_SEEN` | First encounter of device fingerprint | +10 pts | First observed fingerprint |
| `REPEATED_DECLINE_SPIKE` | Recent consecutive transaction blocks | +30 pts | $\ge 3$ declines / 24 hr |
| `TRANSACTION_AFTER_HOURS` | High-risk off-hours execution window | +10 pts | Local hour between 02:00 - 05:00 |

---

## 5. Quick Start (Single-Command Run)

### Prerequisites
* Docker 20+ and Docker Compose 2+
* Git

```bash
# 1. Clone repository
git clone https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection.git
cd fintech-fraud-detection

# 2. Configure environment
cp .env.example .env

# 3. Launch entire infrastructure and services
docker-compose up --build
```

The system automatically initializes:
* **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
* **Backend REST API**: [http://localhost:8080](http://localhost:8080)
* **Actuator Health Endpoint**: [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
* **PostgreSQL Database**: `localhost:5432` (`fraudguard_db`)
* **Redis Cache**: `localhost:6379`
* **Kafka Cluster**: `localhost:9092`

---

## 6. Demo Credentials

Pre-seeded credentials for immediate exploration:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@fraudguard.io` | `Customer123!` | Checkout simulator, sandbox QA controls, personal ledger |
| **Analyst** | `analyst@fraudguard.io` | `Analyst123!` | Live queue, SSE streams, forensic drawer, rule tuning, blacklists |

---

## 7. API Reference

### Authentication
| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Validates credentials and returns signed JWT |

### Checkout & Customer Inquiries
| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/checkout` | `ROLE_CUSTOMER` | Submits payment with biometrics for instant scoring |
| `GET` | `/api/v1/customer/transactions` | `ROLE_CUSTOMER` | Retrieves customer's personal paginated transactions |
| `GET` | `/api/v1/customer/transactions/{id}` | `ROLE_CUSTOMER` | Inspects single transaction details with ownership check |

### Compliance Analyst Workbench
| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analyst/metrics` | `ROLE_ANALYST` | Returns aggregated 24h operational KPIs and volume |
| `GET` | `/api/v1/analyst/transactions` | `ROLE_ANALYST` | Paginated search of flagged transactions |
| `GET` | `/api/v1/analyst/transactions/{id}` | `ROLE_ANALYST` | Full forensic transaction detail with intelligence chips |
| `POST` | `/api/v1/analyst/transactions/{id}/adjudicate` | `ROLE_ANALYST` | Manually approves or blocks a held transaction |
| `GET` | `/api/v1/analyst/rules` | `ROLE_ANALYST` | Lists all 20 fraud heuristics with current weights |
| `PUT` | `/api/v1/analyst/rules/{id}` | `ROLE_ANALYST` | Dynamically updates rule threshold, weight, or active flag |
| `GET` | `/api/v1/analyst/blacklists` | `ROLE_ANALYST` | Lists blocked IPs, devices, emails, and fingerprints |
| `POST` | `/api/v1/analyst/blacklists` | `ROLE_ANALYST` | Adds negative entity to global Redis and DB blacklist |
| `DELETE` | `/api/v1/analyst/blacklists/{id}` | `ROLE_ANALYST` | Removes entity from blacklist |
| `GET` | `/api/v1/analyst/audit-logs` | `ROLE_ANALYST` | Queries immutable compliance audit history |
| `GET` | `/api/v1/analyst/dashboard/stream` | `ROLE_ANALYST` | Subscribes to real-time SSE stream of review transactions |

---

## 8. Project Structure

```
fintech-fraud-detection/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions pipeline
├── backend/
│   ├── src/main/java/com/fraudguard/
│   │   ├── config/                # Security, Redis, Kafka, Web configs
│   │   ├── controller/            # REST API endpoints
│   │   ├── dto/                   # Request/Response data transfers
│   │   ├── engine/                # Core 20-rule risk scoring engine
│   │   ├── entity/                # JPA entities (Transaction, AuditLog, etc.)
│   │   ├── enrichment/            # GeoIP, IPQS, and Telemetry enrichers
│   │   ├── exception/             # Centralized global exception handler
│   │   ├── kafka/                 # Event publishers, consumers, and listeners
│   │   ├── repository/            # Spring Data repositories
│   │   ├── security/              # JJWT auth filter & UserDetailsService
│   │   ├── service/               # Checkout, Analyst, and Audit services
│   │   └── util/                  # Client IP extractors and math helpers
│   ├── src/main/resources/
│   │   ├── db/migration/          # Flyway schema V1, triggers V2, seed V3
│   │   └── application.yml        # Config with environment variable overrides
│   ├── Dockerfile                 # Multi-stage Java 17 container build
│   └── pom.xml                    # Maven build dependencies
├── frontend/
│   ├── src/
│   │   ├── api/                   # Centralized Axios client & SSE helpers
│   │   ├── components/            # Reusable UI (Drawer, PagedTable, Badges)
│   │   ├── context/               # AuthContext & ToastContext
│   │   ├── hooks/                 # Biometrics, Fingerprinting, and Auth hooks
│   │   ├── pages/                 # Login, CustomerPortal, AnalystCockpit
│   │   ├── App.jsx                # Route hierarchy and RBAC guards
│   │   ├── index.css              # Dark theme tokens and Tailwind directives
│   │   └── main.jsx               # Client entrypoint
│   ├── Dockerfile                 # Multi-stage Vite + Nginx container build
│   ├── nginx.conf                 # Reverse proxy with SSE streaming support
│   ├── tailwind.config.js         # Slate/Indigo palette & Inter typography
│   └── package.json               # Frontend dependencies
├── .env.example                   # Environment configuration template
├── docker-compose.yml             # Single-command multi-service orchestrator
└── README.md                      # Platform documentation
```

---

## 9. Development Setup (Without Docker)

### 1. Start Infrastructure
Ensure PostgreSQL (port 5432), Redis (port 6379), and Kafka (port 9092) are running locally or via Docker:
```bash
docker run -d --name pg -p 5432:5432 -e POSTGRES_DB=fraudguard_db -e POSTGRES_PASSWORD=postgres postgres:16-alpine
docker run -d --name rd -p 6379:6379 redis:7-alpine
```

### 2. Run Backend
```bash
cd backend
mvn clean spring-boot:run
```

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
# Vite runs at http://localhost:5173
```

---

## 10. License

This project is licensed under the [MIT License](LICENSE).
