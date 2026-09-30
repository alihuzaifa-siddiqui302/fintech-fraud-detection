# 🛡️ FraudGuard — Enterprise FinTech Fraud Intelligence Platform

> **High-throughput, sub-100ms financial fraud detection, compliance adjudication, and AI-powered investigation cockpit.**

[![CI](https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection/actions/workflows/ci.yml/badge.svg)](https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection/actions/workflows/ci.yml)
![Java](https://img.shields.io/badge/Java-17-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2.5-6DB33F?style=flat&logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis&logoColor=white)
![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-7.4-231F20?style=flat&logo=apachekafka&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=flat&logo=google&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 📌 Table of Contents
- [1. Overview](#1-overview)
- [2. System Architecture](#2-system-architecture)
- [3. Key Platform Capabilities](#3-key-platform-capabilities)
- [4. How to Clone & Run Locally](#4-how-to-clone--run-locally)
- [5. Demo Credentials & User Roles](#5-demo-credentials--user-roles)
- [6. Interactive Feature Walkthrough](#6-interactive-feature-walkthrough)
  - [Customer Checkout & Sandbox Simulator](#customer-checkout--sandbox-simulator)
  - [3D-Secure Adaptive Step-Up OTP](#3d-secure-adaptive-step-up-otp)
  - [Analyst Cockpit & Live Queue](#analyst-cockpit--live-queue)
  - [Interactive Fraud Syndicate Link Graph](#interactive-fraud-syndicate-link-graph)
  - [Automated FinCEN AI SAR Generator](#automated-fincen-ai-sar-generator)
- [7. Fraud Scoring Engine (20 Rules)](#7-fraud-scoring-engine-20-rules)
- [8. API Reference](#8-api-reference)
- [9. Tech Stack & Directory Structure](#9-tech-stack--directory-structure)
- [10. Troubleshooting](#10-troubleshooting)

---

## 1. Overview

**FraudGuard** is an end-to-end FinTech risk intelligence and compliance engineering platform. It evaluates electronic payment transactions against **20 real-time behavioral, network, velocity, and biometric heuristics in under 100 milliseconds**. 

Designed for high-growth neo-banks and payment service providers (PSPs), FraudGuard pairs **low-latency synchronous decisioning** with an **asynchronous event-driven audit pipeline (Apache Kafka + Redis)** and an interactive **analyst investigation cockpit** equipped with Cytoscape link graphs and Google Gemini generative compliance reporting.

---

## 2. System Architecture

```
                                  +-------------------------------------------------------------+
                                  |                     CLIENT APPLICATION                      |
                                  |   [ Customer Portal ]               [ Compliance Cockpit ]  |
                                  |    (Checkout / Biometrics)           (Triage / Graphs / AI) |
                                  +------------------------------+------------------------------+
                                                                 | HTTPS / JWT
                                                                 v
                                  +-------------------------------------------------------------+
                                  |                     REVERSE PROXY & WAF                     |
                                  |                   Nginx (Port 80 / Port 5173)               |
                                  +------------------------------+------------------------------+
                                                                 |
                                                                 v
+-------------------------------------------------------------------------------------------------------------------------+
|                                              SPRING BOOT APPLICATION LAYER                                              |
|                                                                                                                         |
|   +-----------------------+     +-----------------------+     +-----------------------+     +-----------------------+   |
|   |   Security Filter     | --> |   Checkout Controller | --> |  Enrichment Engine    | --> |   Fraud Risk Engine   |   |
|   |   (Stateless JWT)     |     |   (Validation & SLA)  |     |  (GeoIP, IPQS, Device)|     |   (20 Active Rules)   |   |
|   +-----------------------+     +-----------------------+     +-----------------------+     +-----------------------+   |
|                                                                                                         |               |
|                                                                                                         v               |
|   +-----------------------------------------------------------------------------------------------------------------+   |
|   |                                          ADJUDICATION & AUDIT ORCHESTRATION                                     |   |
|   |   - Atomic Transaction Persistence (PostgreSQL 16)                                                              |   |
|   |   - Instant Decision: APPROVED | PENDING_REVIEW (3DS OTP Challenge) | BLOCKED                                    |   |
|   |   - Asynchronous Event Publishing (Kafka Producer with Snappy compression & Idempotence)                         |   |
|   |   - GenAI Regulatory Narrative Dispatcher (Google Gemini 2.5 Flash)                                             |   |
|   +-----------------------------------------------------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------------------------------------------------+
                     |                                           |                                           |
                     v                                           v                                           v
       +---------------------------+               +---------------------------+               +---------------------------+
       |       PostgreSQL 16       |               |          Redis 7          |               |       Apache Kafka        |
       |  - Transactions & Audits  |               |  - Sliding-Window Limits  |               |  - fraudguard.txn.raw     |
       |  - Flyway Migrations (V6) |               |  - Blacklist Fast Cache   |               |  - fraudguard.txn.decided |
       |  - Strict Referential FKs |               |  - Rule Weights & Caching |               |  - fraudguard.audit.events|
       +---------------------------+               +---------------------------+               +---------------------------+
                     ^                                                                                       |
                     |                                                                                       v
                     +=========================== Kafka Event Consumers =====================================+
                                                  (Audit Archival, Dead-Letter Queues, SSE Event Stream)
```

---

## 3. Key Platform Capabilities

- ⚡ **Sub-100ms Adjudication**: Parallel enrichment (IP geolocation, proxy detection, hardware fingerprinting) coupled with in-memory Redis checks.
- 🎯 **20 Dynamic Risk Rules**: Weighted heuristics spanning velocity bursts, mechanical keystroke intervals, headless browser detection, and IP risk.
- 🔐 **Adaptive 3D-Secure (3DS) Step-Up**: Moderate-risk transactions (scores 30–69) trigger a secure one-time password (OTP) verification modal before approval.
- 🕸️ **Syndicate Link Analysis Graph**: Visual network analysis (`/admin/graph`) rendered with Cytoscape.js linking correlated users, shared device fingerprints, IPs, and emails to detect multi-account fraud rings.
- 🤖 **AI-Powered FinCEN SAR Generator**: Compliance officers can generate regulatory-compliant Suspicious Activity Report narratives using Google Gemini 2.5 in seconds.
- 📡 **Real-Time SSE Analyst Stream**: Server-Sent Events push flagged transactions instantly to the triage dashboard without manual polling.

---

## 4. How to Clone & Run Locally

### Prerequisites
Make sure you have installed on your machine:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v20+ with Docker Compose v2+)
* [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository
Open your terminal (PowerShell, Command Prompt, or Bash) and clone the project:
```bash
git clone https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection.git
cd fintech-fraud-detection
```

### Step 2: (Optional) Configure Environment Variables
A pre-configured template is provided. Copy it to `.env`:
```bash
# On Linux / macOS:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```
> *Note: If you have a Google Gemini API key, add `GEMINI_API_KEY=your_key_here` to `.env` to enable live AI SAR generation.*

### Step 3: Start the Application with Docker Compose
Launch all 6 services (Frontend, Backend, PostgreSQL, Redis, Kafka, Zookeeper) with one command:
```bash
docker compose up --build -d
```

*(This compiles the Java 17 backend, builds the React 18 production bundle with Nginx, applies all Flyway database migrations `V1__` through `V6__`, and provisions Kafka topics).*

---

### Step 4: Access the Application

Once the containers start up, access the platform in your browser:

| Application Interface | URL | Purpose |
| :--- | :--- | :--- |
| 🛍️ **Customer Portal & Simulator** | [http://localhost:5173/portal/checkout](http://localhost:5173/portal/checkout) | Test payment checkouts, simulate attack vectors, trigger OTP challenges |
| 🛡️ **Analyst Cockpit & Live Triage** | [http://localhost:5173/admin/dashboard](http://localhost:5173/admin/dashboard) | Live queue of flagged transactions, rule config, blacklists |
| 🕸️ **Fraud Syndicate Link Graph** | [http://localhost:5173/admin/graph](http://localhost:5173/admin/graph) | Visual network graph showing shared entities and fraud rings |
| 🔌 **Backend REST API** | [http://localhost:8080](http://localhost:8080) | Core Spring Boot REST API |
| 🩺 **Actuator Health Check** | [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) | Real-time health status of database, Redis, and Kafka |

To stop the containers at any time:
```bash
docker compose down
```

---

## 5. Demo Credentials & User Roles

The database is pre-seeded with two specialized roles:

| Role | Email | Password | Primary Features Accessible |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@fraudguard.io` | `Customer123!` | Checkout simulator, sandbox QA toggles (VPN, Foreign IP, Bot), step-up OTP challenge, personal transaction ledger |
| **Analyst** | `analyst@fraudguard.io` | `Analyst123!` | Live transaction triage, forensic drawer, rule tuning, blacklists, Syndicate Link Graph, AI SAR drafting |

---

## 6. Interactive Feature Walkthrough

### Customer Checkout & Sandbox Simulator
Visit `/portal/checkout` while logged in as `customer@fraudguard.io`.
- Enter any transaction amount (e.g. `$150.00`).
- The simulator captures **20 behavioral client signals** (keystroke dynamics, mouse activity, canvas device fingerprint, browser timezone).
- **QA Attack Toggles**:
  - 🌐 **Foreign IP**: Simulates traffic originating from high-risk geolocations.
  - 🔒 **VPN Active**: Simulates an anonymizing proxy/VPN endpoint.
  - 📱 **New Device**: Generates a randomized hardware fingerprint.
  - 🤖 **Headless Mode**: Emulates a Selenium/Puppeteer automated crawler.
  - ⚡ **Velocity Attack ($\times 5$)**: Fires 5 consecutive requests within 2 seconds to trigger velocity surge thresholds.

### 3D-Secure Adaptive Step-Up OTP
- When a transaction receives a moderate risk score ($30 \le \text{Score} \le 69$), it is not outright blocked.
- Instead, the backend enters `PENDING_REVIEW` and issues an **encrypted OTP challenge**.
- A 3DS authentication modal appears on the checkout page. The user can enter the one-time code (or use the sandbox autofill) to safely verify their identity and approve the transaction.

### Analyst Cockpit & Live Queue
Visit `/admin/dashboard` while logged in as `analyst@fraudguard.io`.
- View real-time transactions streaming over **Server-Sent Events (SSE)**.
- Filter by status (`APPROVED`, `PENDING_REVIEW`, `BLOCKED`).
- Click any transaction to open the **Forensic Inspection Drawer**, showing:
  - Exact risk score gauge (0–100)
  - Detailed breakdown of all triggered rules with added risk points
  - Client device telemetry and resolved IP intelligence
  - One-click manual adjudication (**Approve** / **Block**) and blacklisting

### Interactive Fraud Syndicate Link Graph
Navigate to `/admin/graph`:
- An interactive network visualization built with **Cytoscape.js**.
- **Nodes**:
  - 👤 **Users** (Blue circles)
  - 🌐 **IP Addresses** (Purple diamonds)
  - 💻 **Device Fingerprints** (Emerald squares)
  - ✉️ **Emails** (Amber hexagons)
- **Syndicate Detection**:
  - Whenever multiple accounts share the same device fingerprint or IP address, the graph connects them with directional edges.
  - Nodes with high risk scores (>70) pulse with crimson warnings.
  - Click on any node to view entity metadata, transaction frequency, and direct connections.

### Automated FinCEN AI SAR Generator
In the transaction inspection drawer for any flagged or blocked transaction:
- Click the **"Generate AI SAR"** button.
- FraudGuard's GenAI module packages the transaction's forensic data (signals, geolocation, velocity bursts, account history) and prompts **Google Gemini 2.5 Flash**.
- In seconds, a structured, professional **FinCEN Suspicious Activity Report narrative** is generated, complete with:
  1. Executive Summary
  2. Identified Red Flags & Behavioral Discrepancies
  3. Chronological Audit Trail
  4. Law Enforcement Recommendation

---

## 7. Fraud Scoring Engine (20 Rules)

The engine evaluates each transaction against active rules loaded from the database and cached in Redis:

| Rule Code | Monitored Risk Signal | Weight | Default Threshold |
| :--- | :--- | :---: | :--- |
| `IP_GEO_HIGH_RISK` | High-risk geolocation origin | +40 pts | RU, NG, BY, KP, IR |
| `IP_IS_VPN` | Commercial VPN anonymizer | +25 pts | True |
| `IP_IS_TOR` | Tor network exit node relay | +40 pts | True |
| `IP_IS_PROXY` | Public or residential proxy | +25 pts | True |
| `IP_IS_HOSTING` | Datacenter or cloud hosting IP | +20 pts | True |
| `IP_RISK_SCORE_HIGH` | External threat score | +30 pts | IP Threat Score $\ge 75$ |
| `VELOCITY_CARD_1M` | Card 1-minute velocity burst | +35 pts | $> 2$ transactions / min |
| `VELOCITY_CARD_1H` | Card 1-hour velocity accumulation | +25 pts | $> 5$ transactions / hour |
| `VELOCITY_CARD_24H` | Card 24-hour total transactions | +20 pts | $> 10$ transactions / 24 hr |
| `VELOCITY_IP_1H` | Single IP rapid velocity surge | +30 pts | $> 5$ transactions / hour |
| `VELOCITY_DEVICE_24H` | Device ID rapid cycling | +25 pts | $> 4$ accounts / 24 hr |
| `TIME_ON_PAGE_TOO_FAST` | Automated bot page interaction | +20 pts | $< 2,000$ ms on checkout |
| `CLIPBOARD_PASTE_DETECTED` | Automated clipboard payment injection | +15 pts | Paste detected on input |
| `BROWSER_TIMEZONE_MISMATCH`| Browser vs. IP geolocation discrepancy | +15 pts | Timezones conflict |
| `HEADLESS_BROWSER_DETECTED`| Headless Chrome or Selenium driver | +35 pts | `navigator.webdriver` = true |
| `KEYSTROKE_ZERO_VARIANCE` | Non-human mechanical typing | +20 pts | Standard deviation $< 10$ ms |
| `HIGH_TRANSACTION_AMOUNT` | Elevated financial ticket value | +40 pts | Amount $> \$2,000.00$ |
| `NEW_DEVICE_FIRST_SEEN` | First encounter of device fingerprint | +10 pts | First observed fingerprint |
| `REPEATED_DECLINE_SPIKE` | Recent consecutive transaction blocks | +30 pts | $\ge 3$ declines / 24 hr |
| `TRANSACTION_AFTER_HOURS` | High-risk off-hours execution | +10 pts | Local hour 02:00 – 05:00 |

* **Score $< 30$** $\rightarrow$ **APPROVED**
* **Score $30 - 69$** $\rightarrow$ **PENDING_REVIEW** *(triggers 3DS OTP step-up challenge)*
* **Score $\ge 70$** or **Blacklist Hit** $\rightarrow$ **BLOCKED**

---

## 8. API Reference

### Authentication
| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Validates credentials and returns signed JWT |

### Checkout & Customer Endpoints
| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/checkout` | `ROLE_CUSTOMER` | Submits payment with biometrics for instant scoring |
| `POST` | `/api/v1/checkout/challenge/verify` | `ROLE_CUSTOMER` | Verifies 3DS OTP challenge for held transactions |
| `POST` | `/api/v1/checkout/challenge/resend` | `ROLE_CUSTOMER` | Generates a new OTP challenge code |
| `GET` | `/api/v1/customer/transactions` | `ROLE_CUSTOMER` | Retrieves customer's personal paginated transactions |
| `GET` | `/api/v1/customer/transactions/{id}` | `ROLE_CUSTOMER` | Inspects single transaction details |

### Analyst Cockpit Endpoints
| Method | Path | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analyst/metrics` | `ROLE_ANALYST` | Returns 24h operational KPIs and volume stats |
| `GET` | `/api/v1/analyst/transactions` | `ROLE_ANALYST` | Paginated search of flagged transactions |
| `GET` | `/api/v1/analyst/transactions/{id}` | `ROLE_ANALYST` | Full forensic transaction details |
| `POST` | `/api/v1/analyst/transactions/{id}/adjudicate` | `ROLE_ANALYST` | Manually approves or blocks a transaction |
| `GET` | `/api/v1/analyst/graph/data` | `ROLE_ANALYST` | Returns nodes and edges for Syndicate Link Graph |
| `POST` | `/api/v1/analyst/sar/generate/{id}` | `ROLE_ANALYST` | Triggers Google Gemini AI SAR narrative generation |
| `GET` | `/api/v1/analyst/sar/status` | `ROLE_ANALYST` | Returns AI service availability and model status |
| `GET` | `/api/v1/analyst/rules` | `ROLE_ANALYST` | Lists all 20 heuristics with current weights |
| `PUT` | `/api/v1/analyst/rules/{id}` | `ROLE_ANALYST` | Dynamically updates rule threshold or weight |
| `GET` | `/api/v1/analyst/blacklists` | `ROLE_ANALYST` | Lists blocked IPs, devices, and emails |
| `POST` | `/api/v1/analyst/blacklists` | `ROLE_ANALYST` | Adds entity to global Redis and DB blacklist |
| `DELETE`| `/api/v1/analyst/blacklists/{id}` | `ROLE_ANALYST` | Removes entity from blacklist |
| `GET` | `/api/v1/analyst/dashboard/stream` | `ROLE_ANALYST` | Subscribes to real-time SSE stream |

---

## 9. Tech Stack & Directory Structure

```
fintech-fraud-detection/
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── backend/
│   ├── src/main/java/com/fraudguard/
│   │   ├── client/                # IpApiClient & external intelligence
│   │   ├── config/                # Security, Redis, Kafka, Web configs
│   │   ├── controller/            # REST API endpoints
│   │   ├── dto/                   # DTO records and payloads
│   │   ├── engine/                # Core 20-rule risk scoring engine
│   │   ├── entity/                # JPA entities (Transaction, Blacklist, OTP, etc.)
│   │   ├── kafka/                 # Event publishers, consumers, and listeners
│   │   ├── repository/            # Spring Data JPA repositories
│   │   ├── security/              # JJWT auth filter & RBAC rules
│   │   └── service/               # Checkout, Enrichment, Analyst, AI SAR services
│   ├── src/main/resources/
│   │   ├── db/migration/          # Flyway schema V1 through V6
│   │   └── application.yml        # Spring Boot configuration
│   ├── Dockerfile                 # Multi-stage Java 17 container build
│   └── pom.xml                    # Maven dependencies
├── frontend/
│   ├── src/
│   │   ├── api/                   # Axios API clients & SSE listeners
│   │   ├── components/            # Reusable UI (Drawer, OTPModal, Navbar)
│   │   ├── context/               # AuthContext & ToastContext
│   │   ├── pages/                 # Checkout, Transactions, Dashboard, FraudGraph
│   │   ├── App.jsx                # React Router & role-based guards
│   │   └── main.jsx               # React entrypoint
│   ├── Dockerfile                 # Multi-stage Vite + Nginx build
│   └── package.json               # Frontend dependencies
├── docker-compose.yml             # Full 6-service orchestration
└── README.md                      # Platform documentation
```

---

## 10. Troubleshooting

### Port Conflicts
If port `8080`, `5173`, `5432`, or `6379` is already in use by another application:
* Modify the host port mappings in `docker-compose.yml` (e.g. `"5433:5432"` for PostgreSQL).

### Checking Service Logs
To view logs for any individual service:
```bash
docker compose logs backend -f
docker compose logs frontend -f
docker compose logs kafka -f
```

### Resetting Database
To cleanly wipe and recreate the database with all fresh seed data:
```bash
docker compose down -v
docker compose up --build -d
```

---

## 11. License

This project is licensed under the [MIT License](LICENSE).
