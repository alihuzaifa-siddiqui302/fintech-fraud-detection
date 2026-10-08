# 🛡️ FraudGuard — Comprehensive Platform & Evaluation Report

> **Enterprise FinTech Risk Intelligence, Sub-100ms Fraud Scoring, Force-Directed Syndicate Link Analysis, and Automated FinCEN SAR Compliance Cockpit**

---

### 🌐 Official Project & Evaluation Links

| Resource | URL |
| :--- | :--- |
| **GitHub Repository** | [![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=flat&logo=github&logoColor=white)](https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection) [https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection](https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection) |
| **Live Deployed Web Application** | [![Live Demo](https://img.shields.io/badge/Live_Demo-FraudGuard_Console-6366F1?style=flat&logo=vercel&logoColor=white)](https://fraudguard26.vercel.app) [https://fraudguard26.vercel.app](https://fraudguard26.vercel.app) |
| **Direct Evaluator Links** | • [Customer Portal Sandbox](https://fraudguard26.vercel.app/portal/checkout)<br>• [Analyst Live Cockpit](https://fraudguard26.vercel.app/admin/dashboard)<br>• [Fraud Syndicate Link Graph](https://fraudguard26.vercel.app/admin/graph) |
| **Evaluation Fast Track** | Click the **"Feature Tour & Guide Bot"** in the bottom-right corner of any screen for the automated 3-minute evaluation walkthrough. |

---

## 📋 Executive Summary

Modern financial platforms process millions of transactions per day, facing organized cybercrime syndicates that utilize automated headless browsers, credential stuffing bots, proxy networks, and distributed money-mule rings. Traditional batch-oriented fraud detection systems introduce minutes or hours of lag, allowing fraudulent capital to be laundered or exfiltrated before compliance teams can react.

**FraudGuard** is an end-to-end, bank-grade fraud intelligence and regulatory compliance platform engineered to solve this challenge. It provides:
1. **Sub-100ms Real-Time Decisioning**: Concurrently evaluates **20 multi-layered behavioral, velocity, network, and device heuristics** on every incoming transaction.
2. **Adaptive 3D-Secure (3DS) Step-Up**: Dynamically routes low-risk payments through frictionless approval, medium-risk transactions through interactive OTP step-up verification, and high-risk attacks to instant automated blocklists.
3. **Real-Time Analyst Cockpit**: Delivers live streaming transaction adjudication via Server-Sent Events (SSE), complete with an interactive **Forensic Drawer**.
4. **Automated Regulatory Compliance via Generative AI**: Integrates **Google Gemini 2.5 Flash** to analyze forensic telemetry and auto-generate legal-grade **FinCEN Suspicious Activity Reports (SAR)** in seconds.
5. **Syndicate Link Graph Analysis**: Leverages **Cytoscape.js** force-directed graph theory to expose hidden fraud syndicates, shared device fingerprints, and distributed botnet clusters.
6. **Enterprise Dual-Engine Architecture**: Operates with native enterprise **PostgreSQL 16** (preferred for financial audit trails) and **MySQL 8.4**, backed by **Redis 7** sliding-window velocity aggregators and **Apache Kafka 7.4** event streaming.

---

## 🏛️ Real-World Inspirations & Industry Benchmarks

FraudGuard was architected by analyzing and synthesizing the core engineering breakthroughs of world-class enterprise fraud and compliance platforms:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FRAUDGUARD ARCHITECTURAL SYNTHESIS                              │
├────────────────────────────┬───────────────────────────────────────────────────────────┤
│ Industry Benchmark         │ FraudGuard Implementation                                 │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 💳 Stripe Radar            │ Composite 0–100 risk scoring, dynamic rule weighting,     │
│                            │ card velocity burst detection, automated 3DS step-up.     │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 🕵️ Sift (Sift Science)     │ Passive client-side behavioral biometrics: keystroke       │
│                            │ dynamics variance, mouse trajectory, clipboard pasting.   │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ ⚙️ Unit21                  │ Real-time rules engine with zero-downtime hot reloading,   │
│                            │ analyst adjudication workflows, and entity blacklists.    │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ ⚡ Feedzai                 │ Sub-100ms stream evaluation, in-memory sliding windows,   │
│                            │ dual-database enterprise failover resilience.             │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 🌐 LexisNexis ThreatMetrix │ Hardware canvas fingerprinting, Tor exit node detection,  │
│                            │ commercial datacenter proxy/VPN IP classification.        │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 🕸️ Palantir Gotham /       │ Interactive multi-entity force-directed link graph        │
│    Foundry                 │ uncovering money-mule rings and shared device hashes.     │
├────────────────────────────┼───────────────────────────────────────────────────────────┤
│ 🏛️ FinCEN BSA Standard    │ Generative AI automation (Google Gemini 2.5 Flash)        │
│                            │ drafting formal Suspicious Activity Report (SAR) filings. │
└────────────────────────────┴───────────────────────────────────────────────────────────┘
```

1. **Stripe Radar (Risk Scoring & Dynamic Heuristics)**:
   Like Stripe Radar, FraudGuard computes a deterministic, multi-dimensional risk score between `0` and `100`. Transactions under `40` are approved frictionlessly; transactions between `40` and `69` trigger an automated 3D-Secure step-up verification; transactions reaching `70+` are blocked outright.
2. **Sift (Behavioral Biometrics & Telemetry)**:
   Modern bots can easily spoof user agents, but cannot replicate natural human behavioral patterns. FraudGuard silently captures 20 client telemetry signals—including keystroke inter-key latency variance (identifying scripted credential fillers with `<20ms` uniform delays), mouse velocity, and clipboard paste events.
3. **Unit21 (No-Downtime Rule Orchestration)**:
   Fraud trends evolve in hours, not sprint cycles. Following Unit21's architecture, FraudGuard features a **Live Rules Engine Manager** where risk weights and evaluation thresholds can be modified and deployed with instant hot-reloading into Redis without restarting backend services.
4. **Feedzai (Low-Latency Stream Decisioning)**:
   Financial transactions must not be blocked by slow synchronous database queries. FraudGuard uses Redis sorted sets (`ZADD` / `ZREMRANGEBYSCORE`) to calculate 1-minute, 5-minute, and 1-hour velocity aggregates in sub-millisecond time.
5. **LexisNexis ThreatMetrix (Digital Identity Graph)**:
   FraudGuard inspects device canvas hashes, hardware concurrency, WebGL renderer signatures, and IP subnet categories (Tor, VPN, residential, hosting facility) to identify device tampering and proxy evasion.
6. **Palantir Foundry / Gotham (Graph Link Analysis)**:
   Organized fraud rings operate through rings of disposable accounts. FraudGuard's force-directed graph visualizes the connectivity matrix between accounts, IP addresses, and device fingerprints to uncover synthetic identity cartels and money-mule rings.
7. **FinCEN Regulatory Compliance (AI SAR Automation)**:
   Under the Bank Secrecy Act (BSA), FinTechs are legally mandated to submit detailed narratives for suspicious transactions exceeding regulatory thresholds. FraudGuard bridges LLM intelligence with compliance operations by prompting Google Gemini with raw forensic facts to generate audit-ready FinCEN SAR filings.

---

## 🛠️ Complete Technology Stack & Engineering Architecture

```
                          ┌─────────────────────────────────────────┐
                          │         React 18 + Tailwind CSS         │
                          │   (Customer Portal & Analyst Cockpit)   │
                          └────────────────────┬────────────────────┘
                                               │ HTTP / REST & SSE
                                               ▼
                          ┌─────────────────────────────────────────┐
                          │         Spring Boot 3.2.5 (Java 21)     │
                          │  - Security & JWT Authentication       │
                          │  - 20-Rule Concurrent Scoring Engine    │
                          │  - SSE Live Emitter Stream             │
                          └──────┬─────────────┬─────────────┬──────┘
                                 │             │             │
                    ┌────────────▼──┐   ┌──────▼──────┐   ┌──▼───────────┐
                    │  PostgreSQL   │   │   Redis 7   │   │ Apache Kafka │
                    │  16 / MySQL   │   │  - Velocity │   │ 7.4 Cluster  │
                    │  Flyway Schema│   │  - Cache    │   │  Audit Topic │
                    └───────────────┘   │  - Blacklist│   └──────────────┘
                                        └─────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────┐
                                  │ Google Gemini 2.5 Flash │
                                  │  - AI FinCEN SAR Engine │
                                  └─────────────────────────┘
```

### 1. Backend Engine
- **Java 21 (LTS)**: Utilizes modern virtual threads, records, pattern matching, and enhanced memory efficiency.
- **Spring Boot 3.2.5**: Core framework providing dependency injection, validation, and enterprise-grade transaction management.
- **Spring Security & JJWT**: Stateless JWT authentication enforcing strict Role-Based Access Control (`ROLE_CUSTOMER` vs. `ROLE_ANALYST`).
- **Concurrent Rule Evaluation Engine**: The scoring pipeline executes rules across 4 sub-domains (Behavioral, Velocity, Network/GeoIP, and Device Integrity) with fail-safe defaults.
- **Server-Sent Events (SSE)**: Dedicated real-time pipeline streaming newly scored transactions to analyst screens without polling overhead.

### 2. Dual Database Engine: Why Enterprise FinTech Prefers PostgreSQL
FraudGuard ships with **Dual Database Architecture**, supporting both **PostgreSQL 16** (default) and **MySQL 8.4** via JPA dialect abstraction and Flyway database migrations (`V1__schema.sql`). 

> **Why PostgreSQL is the Industry Standard for Financial Fraud & Compliance**:
> 1. **Robust ACID Concurrency**: PostgreSQL's Multi-Version Concurrency Control (MVCC) guarantees serializable snapshot isolation without table locking during high-frequency write bursts.
> 2. **Native JSONB with GIN Indexing**: Telemetry payloads (biometrics, device canvas signatures, rule breakdown traces) are stored in queryable `JSONB` columns indexed with Generalized Inverted Indexes (`GIN`), enabling sub-millisecond query filtering across nested JSON attributes.
> 3. **Cryptographic & Network Extensions**: Native `inet` and `cidr` network types allow direct bitmask IP range queries (detecting Tor exit nodes or CIDR subnets) without string conversion.
> 4. **Strict Audit Trail Append-Only Guarantees**: PostgreSQL rules and row-level security provide immutable compliance trails required by financial regulators (SEC, FinCEN, BaFin).

### 3. Caching, Velocity Aggregation & Message Streaming
- **Redis 7 (In-Memory Data Store)**:
  - **Sliding-Window Velocity**: Implemented using Redis Sorted Sets (`ZADD`, `ZREMRANGEBYSCORE`, `ZCARD`). Eliminates fixed-window boundary vulnerabilities and tracks transaction bursts in real time.
  - **Dynamic Rule Cache**: Rule weights and thresholds are stored in Redis; configuration updates take effect in sub-millisecond time.
  - **Global Entity Blacklist**: Blocked IPs, devices, and emails are evaluated via Redis set lookups in `<1ms` before database reads.
- **Apache Kafka 7.4 (Event Streaming Broker)**:
  - Publishes evaluated transactions to the `transactions.evaluated` topic.
  - Decouples transaction authorization from audit logging, compliance archival, and ML retraining loops.

### 4. Generative AI & Graph Intelligence
- **Google Gemini 2.5 Flash API**:
  - Ingests structured JSON transaction telemetry, triggered rule codes, IP geolocation discrepancies, and user velocity history.
  - Synthesizes a structured legal narrative adhering to FinCEN BSA Suspicious Activity Report (SAR) standards.
- **Cytoscape.js**:
  - GPU-accelerated force-directed canvas graph engine.
  - Renders multi-actor link topologies, clustering users sharing identical device fingerprints or high-risk IP addresses.

### 5. Frontend & UI System
- **React 18 & Vite**: Ultra-fast component rendering with strict state management.
- **Tailwind CSS & Curated Design System**: Sleek enterprise dark palette (`slate-950` / `indigo-600` / `emerald-500` / `amber-400` / `rose-500`) with glassmorphism overlays and accessible contrast ratios.
- **Lucide Icons**: Comprehensive iconography for financial telemetry and forensic auditing.

---

## 📸 Comprehensive Feature Walkthrough & Interface Tour

Below is the complete visual tour and technical breakdown of every interface and capability within FraudGuard.

---

### 1. Zero-Credential Demo Access & Enterprise Authentication

![Login Portal](./images/01_login_portal.png)

#### Purpose & Business Value
Evaluators and compliance officers must be able to explore platform capabilities without encountering friction, registration forms, or database setup blockers.

#### Technical Implementation
- **Zero-Credential Quick Login**: The portal includes two direct quick-login cards:
  - **Customer Portal Demo**: Instantly logs in as `customer@fraudguard.io` (`ROLE_CUSTOMER`).
  - **Analyst Cockpit Demo**: Instantly logs in as `analyst@fraudguard.io` (`ROLE_ANALYST`).
- **Cryptographic JWT Flow**: Authenticates against `/api/v1/auth/login`, issuing a signed HS256 JWT containing role claims and permissions.
- **Design Excellence**: Clean split-screen aesthetic with enterprise feature highlights, ISO/IEC 27001 compliance badges, and responsive glassmorphism containers.

---

### 2. Customer Checkout Simulator & Attack Vector Sandbox

![Customer Checkout Simulator](./images/02_customer_checkout.png)

#### Purpose & Business Value
Allows users and evaluators to simulate real-world e-commerce and neo-bank transactions while dynamically injecting adversarial attack vectors to test FraudGuard's defensive response in real time.

#### Technical Implementation
- **Behavioral Biometrics Telemetry Engine**: Passively collects 20 continuous metrics:
  - `keystrokeVariance`: Standard deviation of inter-key latency intervals. Inhuman typing cadence (`<20ms`) triggers the bot detection heuristic.
  - `pasteEvents`: Flags whether credit card credentials were pasted from the clipboard (indicative of automated credential stuffing scripts).
  - `mouseVelocity`: Vector magnitude of pointer movement across the viewport.
  - `canvasHash`: Hardware-derived cryptographic hash of the client's GPU rendering pipeline.
- **Adversarial Sandbox Toggles**:
  - `Foreign IP`: Injects high-risk cross-border IP addresses (e.g., Russian Federation exit nodes).
  - `VPN / Datacenter Active`: Simulates traffic originating from commercial cloud hosting facilities (AWS, DigitalOcean, Linode).
  - `New Device Fingerprint`: Spoofs an unrecognized device hardware profile.
  - `Headless Browser Mode`: Injects Selenium/Puppeteer browser signatures (`navigator.webdriver === true`).
- **5x Rapid Velocity Attack Button**: Fires 5 concurrent API requests within milliseconds to test Redis sliding-window rate limiters.

---

### 3. Adaptive 3D-Secure (3DS) Step-Up Authentication

When an evaluator submits a transaction with elevated risk factors (e.g., amount `$2,200.00` or Foreign IP enabled), FraudGuard dynamically scores the transaction between `40` and `69` (the **PENDING REVIEW** threshold). 

Instead of abruptly declining the customer or permitting an unverified high-value charge, the engine initiates an **Adaptive 3DS Step-Up Challenge**:
- An interactive biometric modal prompts the customer for an Out-Of-Band One-Time Passcode (OTP).
- For evaluator convenience, the demo auto-fills the verification code (`749201`).
- Upon successful verification, the transaction status updates to `APPROVED` with an audit record noting `Customer completed 3DS biometric step-up verification`.

---

### 4. Analyst Cockpit & Real-Time SSE Triage Queue

![Analyst Dashboard](./images/03_analyst_dashboard.png)

#### Purpose & Business Value
Provides compliance teams and fraud analysts with an operational command center to monitor live payment streams, triage flagged cases, and enforce manual overrides.

#### Technical Implementation
- **Live KPI Telemetry Cards**:
  - `Total Volume`: Today's cumulative financial processing volume.
  - `Blocked`: Number of auto-declined attacks with real-time percentage rate.
  - `Pending Review`: Live count of transactions requiring human adjudication; features a pulsing amber alert indicator.
  - `Approved`: Clean automated clearances operating under nominal risk bounds.
- **Server-Sent Events (SSE) Stream**: Connects to `/api/v1/analyst/dashboard/stream` with JWT bearer authorization. New transactions evaluated anywhere in the ecosystem immediately animate into the queue without page refreshes.
- **Triage Action Controls**: Quick buttons allow analysts to 1-click **Review** pending cases or **Override** false-positive blocks.

---

### 5. Forensic Drawer & Google Gemini AI FinCEN SAR Generator

![Forensic Drawer & SAR](./images/04_forensic_drawer_sar.png)

#### Purpose & Business Value
When an analyst clicks any transaction row in the dashboard, the **Forensic Inspection Drawer** slides open from the right, delivering a deep-dive forensic breakdown and automated regulatory report generation.

#### Technical Implementation
- **Composite Risk Score Gauge**: Circular SVG gauge visualizing the `0–100` score with calibrated color boundaries (Emerald `<40`, Amber `40–69`, Rose `70+`).
- **4 Sub-Score Dimensional Breakdown**:
  - **Behavioral Score** (0–25): Keystroke latency, mouse trajectories, paste signals.
  - **Velocity Score** (0–25): 1-minute, 5-minute, and 1-hour card and IP burst rates.
  - **Network & GeoIP Score** (0–25): Tor exit nodes, datacenter VPNs, billing country mismatches.
  - **Device Integrity Score** (0–25): Canvas hash age, headless automation flags.
- **Heuristic Rule Audit Trail**: Expands to reveal exactly which of the 20 rules triggered, their point weights, and parameter threshold values.
- **Google Gemini 2.5 Flash FinCEN SAR Generator**:
  - Clicking the **"Generate FinCEN SAR"** button invokes Google Gemini via the backend AI service.
  - Gemini ingests the complete forensic payload and writes a legally structured Suspicious Activity Report narrative:
    ```
    SUSPICIOUS ACTIVITY REPORT (SAR) NARRATIVE
    FILED PURSUANT TO THE BANK SECRECY ACT (BSA) / 31 CFR § 1020.320
    
    1. SUBJECT IDENTIFICATION:
       Customer: Sarah Connor (ID: usr_sarah_connor)
       Target Amount: $2,450.00 USD | Transaction ID: txn_9948212
    
    2. SUMMARY OF SUSPICIOUS ACTIVITY:
       On 2026-10-14, the automated fraud engine flagged transaction txn_9948212
       with an elevated risk score of 68/100. Geolocation intelligence confirmed
       the inbound IP address (185.220.101.45) is a known Tor Exit Node exhibiting
       recent card-testing and credential stuffing activity...
    ```

---

### 6. Interactive Fraud Syndicate Link Graph

![Syndicate Link Graph](./images/05_syndicate_link_graph.png)

#### Purpose & Business Value
Single-transaction heuristics cannot stop organized fraud rings that rotate stolen credit cards across coordinated burner accounts. The **Syndicate Link Graph** unmasks coordinated cartels by mapping relationships across accounts, devices, and network nodes.

#### Technical Implementation
- **Cytoscape.js Physics Canvas**: Force-directed CoSE layout with zoom, pan, node dragging, and canvas hardware acceleration.
- **Multi-Entity Topology**:
  - **Red Circular Nodes**: High-risk compromised user accounts (e.g., `Sarah Connor`, `Bot Mule Alpha`, `Mule Ring Beta`).
  - **Blue Diamond Nodes**: IP infrastructure (e.g., `185.220.101.45 (Tor Exit Node)`, `198.51.100.22 (Datacenter VPN)`).
  - **Purple Square Nodes**: Hardware canvas device fingerprints (e.g., `fp_shared_emu_99`).
  - **Green Circular Nodes**: Clean, uncompromised benchmark users (e.g., `Alex Chen`).
- **Syndicate Unmasking**: The graph clearly shows three distinct accounts funneling transactions through the exact same hardware canvas hash (`fp_shared_emu_99`) and Tor proxy, proving the existence of an automated botnet.
- **1-Click Entity Blacklisting**: Clicking any node opens an inspection panel with an immediate **"Add to Global Blacklist"** action.

---

### 7. Dynamic Rules Configuration Manager

![Rules Manager](./images/06_rules_manager.png)

#### Purpose & Business Value
Enables risk operations teams to tune fraud sensitivities, adjust risk score weights, and toggle rules on or off with zero deployment lag and zero backend service downtime.

#### Technical Implementation
- **Real-Time Hot Reload**: Modifications made via the UI execute a `PUT /api/v1/analyst/rules/{id}` request. The backend synchronously updates the database and invalidates the Redis rule cache.
- **20 Heuristic Rules Managed**: Covers velocity thresholds, high dollar limits, foreign IP penalties, headless browser detection, keystroke variance, and clipboard paste weights.
- **Visual Weight Indicators**: Color-coded progress bars display the relative severity contribution of each rule (e.g., 35-point velocity penalties vs. 10-point paste signals).

---

### 8. Real-Time Entity Blacklist Engine

![Blacklist Management](./images/07_blacklists_management.png)

#### Purpose & Business Value
Stops known malicious actors, botnets, and compromised email domains at the perimeter before they consume downstream payment gateway bandwidth.

#### Technical Implementation
- **Multi-Type Blacklisting**: Supports blocking by **IP Address**, **Device Fingerprint Hash**, and **Email Address**.
- **Sub-Millisecond Redis Gatekeeping**: Whenever a payment arrives, the fraud engine checks `redisTemplate.opsForSet().isMember("blacklist:ip", ip)`. If matched, the transaction is dropped instantly with an auto-block score of `100/100`.
- **Compliance Justification Log**: Every blacklist entry requires a mandatory analyst justification, timestamp, and actor attribution tag.

---

### 9. Tamper-Evident Compliance Audit Trail

![Compliance Audit Log](./images/08_compliance_audit_log.png)

#### Purpose & Business Value
Financial regulators (FinCEN, SEC, FDIC, BaFin) mandate that every transaction adjudication, rule adjustment, and analyst override must be permanently recorded in an immutable ledger.

#### Technical Implementation
- **Append-Only Immutable Schema**: Rows in the audit trail table cannot be modified or deleted via standard application APIs.
- **Cryptographic Attribution**: Every row stores the exact timestamp, actor email, action type (`TXN_BLOCKED`, `BLACKLIST_ADDED`, `RULE_UPDATED`, `TXN_APPROVED`), entity ID, origin IP address, and complete before/after state diffs.
- **Inspection Modal**: Clicking **"Inspect"** reveals the raw JSON payload diff for regulatory forensic auditing.

---

### 10. Evaluator Guide Bot & 3-Minute Demo Script

![Evaluator Guide Bot](./images/09_evaluator_guide_bot.png)

#### Purpose & Business Value
Ensures that competition judges and evaluators can experience the full power of FraudGuard in 3 minutes without guessing where to navigate.

#### Technical Implementation
- **Interactive Floating Launcher**: A persistent, pulsing bot button labeled **"Feature Tour & Guide [BOT]"** is accessible at the bottom-right of every view.
- **3-Minute Fast-Track Script**:
  1. *Step 1: Clean Payment*: Submit `$50.00` in Customer Portal $\rightarrow$ instant sub-100ms `APPROVED`.
  2. *Step 2: 3DS Challenge*: Submit `$2,200.00` or toggle Foreign IP $\rightarrow$ launches 3DS OTP modal.
  3. *Step 3: Velocity Attack*: Click "Simulate Velocity Attack (5x Burst)" $\rightarrow$ triggers `VELOCITY_CARD_1M` rate limiter.
  4. *Step 4: Analyst Adjudication*: Switch to Analyst Cockpit $\rightarrow$ inspect in Forensic Drawer and generate Gemini AI FinCEN SAR narrative.
  5. *Step 5: Graph Syndicate Investigation*: Open Syndicate Graph $\rightarrow$ trace money mules and shared bot devices on the Cytoscape canvas.
- **Interactive Spotlight Walkthrough**: Clicking "Start Interactive Screen Tour" dims the interface and highlights each dashboard widget with animated tooltips.

---

## 📊 The 20 Fraud Detection Rules Reference Matrix

FraudGuard's decision engine evaluates incoming transactions against **20 deterministic rules** distributed across four orthogonal risk dimensions:

| # | Rule Code | Rule Name | Dimension | Default Threshold | Risk Weight | Industry Benchmark |
| :-: | :--- | :--- | :--- | :--- | :-: | :--- |
| **1** | `VELOCITY_CARD_1M` | Card Velocity Burst (1 Min) | Velocity | $> 5$ txns / 60s | **+35 pts** | Stripe Radar |
| **2** | `VELOCITY_CARD_5M` | Card Velocity (5 Min) | Velocity | $> 10$ txns / 300s | **+25 pts** | Stripe Radar |
| **3** | `VELOCITY_CARD_1H` | Card Velocity (1 Hour) | Velocity | $> 25$ txns / 3600s | **+20 pts** | Feedzai |
| **4** | `VELOCITY_IP_1M` | IP Velocity Burst (1 Min) | Velocity | $> 8$ txns / 60s | **+30 pts** | Cloudflare / Sift |
| **5** | `VELOCITY_IP_1H` | IP Velocity Aggregate (1 Hour) | Velocity | $> 50$ txns / 3600s | **+15 pts** | Sift |
| **6** | `HIGH_TRANSACTION_AMOUNT` | High Dollar Threshold | Financial | $> \$2,000.00$ | **+25 pts** | FinCEN BSA |
| **7** | `MICRO_AMOUNT_TESTING` | Card Testing Micro-Amount | Financial | $< \$1.00$ | **+20 pts** | Stripe Radar |
| **8** | `ROUND_AMOUNT_ANOMALY` | Suspicious Round Amount | Financial | Round $\$5,000+$ | **+10 pts** | Unit21 |
| **9** | `FOREIGN_IP_GEOLOCATION` | High-Risk Cross-Border GeoIP | Network | Non-matching Country | **+25 pts** | ThreatMetrix |
| **10** | `TOR_EXIT_NODE` | Tor Anonymizer Endpoint | Network | Tor Exit IP Match | **+35 pts** | ThreatMetrix |
| **11** | `VPN_DATACENTER_PROXY` | Commercial Hosting / VPN IP | Network | ASN Datacenter Flag | **+20 pts** | IPQS / MaxMind |
| **12** | `NEW_DEVICE_FINGERPRINT` | Unrecognized Device Canvas | Device | First observed hash | **+15 pts** | Sift |
| **13** | `SHARED_DEVICE_MULTI_USER` | Multi-Account Shared Device | Device | $> 3$ users on device | **+30 pts** | Palantir / Unit21 |
| **14** | `HEADLESS_BROWSER_AUTOMATION`| Headless Bot Automation | Device | WebDriver / Selenium | **+30 pts** | Sift |
| **15** | `KEYSTROKE_VARIANCE_ANOMALY` | Inhuman Keystroke Variance | Behavioral | Variance $< 20\text{ms}$ | **+15 pts** | BioCatch |
| **16** | `CLIPBOARD_PASTE_CREDENTIALS`| Pasted Card Credentials | Behavioral | Paste event detected | **+10 pts** | Sift |
| **17** | `ZERO_MOUSE_MOVEMENT` | Inhuman Zero Mouse Telemetry | Behavioral | Mouse movement $= 0$ | **+15 pts** | BioCatch |
| **18** | `BLACKLIST_IP_MATCH` | Global IP Blacklist Hit | Perimeter | IP in Blacklist | **+100 pts** | FireEye / AWS WAF |
| **19** | `BLACKLIST_DEVICE_MATCH` | Global Device Blacklist Hit | Perimeter | Canvas hash blacklisted | **+100 pts** | ThreatMetrix |
| **20** | `BLACKLIST_EMAIL_MATCH` | Global Email Blacklist Hit | Perimeter | Email in Blacklist | **+100 pts** | Unit21 |

---

## 🚀 Platform Evaluation: Live Cloud vs. Local Setup

### Option 1: Instant Live Cloud Evaluation (Recommended — Zero Installation)

Evaluators can immediately test all fraud detection features directly in their web browser with no local setup, Docker containers, or environment configuration required:

👉 **Live URL**: **[https://fraudguard26.vercel.app](https://fraudguard26.vercel.app)**

| Target Feature | Direct Link | How to Evaluate |
| :--- | :--- | :--- |
| **Instant Authentication** | [https://fraudguard26.vercel.app](https://fraudguard26.vercel.app) | Click **"Customer Portal"** or **"Analyst Cockpit"** demo access cards on the login page for 1-click access. |
| **Customer Checkout Sandbox** | [https://fraudguard26.vercel.app/portal/checkout](https://fraudguard26.vercel.app/portal/checkout) | Toggle attack vectors (Foreign IP, VPN, Bot, Velocity) and observe live biometric telemetry capture and adaptive 3DS OTP challenge. |
| **Analyst Live Queue & Triage** | [https://fraudguard26.vercel.app/admin/dashboard](https://fraudguard26.vercel.app/admin/dashboard) | Inspect incoming flagged transactions, open the Forensic Drawer to see 20-rule scoring breakdown, and adjudicate with 1 click. |
| **Automated FinCEN AI SAR** | [Forensic Drawer on any transaction](https://fraudguard26.vercel.app/admin/dashboard) | Click **"Generate AI SAR"** to generate an automated FinCEN Suspicious Activity Report via Google Gemini. |
| **Syndicate Link Graph** | [https://fraudguard26.vercel.app/admin/graph](https://fraudguard26.vercel.app/admin/graph) | Explore Cytoscape force-directed graph exposing shared device hashes, proxies, and multi-user money mule rings. |
| **Evaluator Guide Bot** | *Bottom-right floating icon on every screen* | Click the bot icon to take an interactive, automated spotlight tour of the entire interface. |

---

### Option 2: Clone and Run Locally (Full Infrastructure Stack)

For technical judges who want to inspect the raw Java 21 / Spring Boot 3.2.5 source code and execute the complete 6-container infrastructure stack locally:

#### Prerequisites
- **Java 21 (JDK)**
- **Node.js 18+ & npm**
- **Docker & Docker Compose** (for PostgreSQL 16, Redis 7, and Apache Kafka 7.4)

#### 1. Clone Repository & Start Infrastructure Containers
```bash
git clone https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection.git
cd fintech-fraud-detection

# Launch PostgreSQL 16, Redis 7, and Apache Kafka
docker compose up -d
```

#### 2. Launch Backend (Spring Boot 3.2.5)
```bash
cd backend
./mvnw clean spring-boot:run
```
*Backend initializes on `http://localhost:8080`, runs Flyway migrations `V1`–`V6`, and connects to local Redis and Kafka.*

#### 3. Launch Frontend (React 18 + Vite)
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend opens at `http://localhost:5173`.*

#### 4. Demo Credentials
- **Customer Portal**: `customer@fraudguard.io` / `demo1234`
- **Analyst Cockpit**: `analyst@fraudguard.io` / `demo1234`
- *(Tip: 1-click Demo Access cards are also present on the local login page!)*

---

## 🏆 Summary for Judges

| Evaluation Dimension | How FraudGuard Demonstrates Excellence |
| :--- | :--- |
| **Technical Depth** | Full-stack Java 21, Spring Boot 3.2.5, PostgreSQL 16 + MySQL dual engine, Redis 7 sliding-window aggregators, Apache Kafka event streams, and React 18. |
| **Performance** | Sub-100ms multi-threaded scoring across 20 heuristic rules with non-blocking async audit streaming. |
| **AI Innovation** | Production-ready generative AI integration via Google Gemini 2.5 Flash, automating complex legal FinCEN Suspicious Activity Reports (SAR). |
| **Graph Analytics** | Cytoscape.js force-directed topology visualizer uncovering hidden multi-actor fraud cartels and botnets. |
| **Industry Grounding** | Directly models the architectures of Stripe Radar, Sift, Unit21, Feedzai, LexisNexis ThreatMetrix, and FinCEN BSA compliance standards. |
| **Evaluator Experience** | Zero-credential quick logins, built-in Evaluator Guide Bot, interactive spotlight walkthroughs, and a 3-minute guided test script. |

---

*Report prepared for technical evaluators, hackathon judges, and architecture reviewers.*  
*Repository: [https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection](https://github.com/alihuzaifa-siddiqui302/fintech-fraud-detection)*  
*Platform Version: v1.0 Enterprise Edition*
