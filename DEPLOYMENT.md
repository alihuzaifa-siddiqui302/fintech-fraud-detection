# FraudGuard — Production Deployment & Operations Guide

This guide provides end-to-end instructions for deploying and running **FraudGuard** across local environments and cloud free-tier infrastructure (Vercel, Render, Neon PostgreSQL, Upstash Redis, and Upstash Kafka).

---

## 1. Architecture Overview

| Component | Technology | Free-Tier Hosting Target | Resource Limit |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide | [Vercel](https://vercel.com) / Cloudflare Pages | Unlimited Bandwidth |
| **Backend** | Spring Boot 3.2, Java 21, JPA/Flyway | [Render.com](https://render.com) (Docker Web Service) | 512 MB RAM / 0.1 CPU |
| **Relational DB** | PostgreSQL 16 (Flyway V1–V6) | [Neon.tech](https://neon.tech) | 0.5 GB Storage |
| **Cache & State** | Redis 7 (Token Bucket / Sliding Window) | [Upstash Redis](https://upstash.com) | 10k requests/day |
| **Event Streaming**| Apache Kafka (Audit & Anomaly Events) | [Upstash Kafka](https://upstash.com) | 10k messages/day |
| **AI SAR Engine**  | Google Gemini Flash (`gemini-2.0-flash`) | [Google AI Studio](https://aistudio.google.com) | 15 RPM / 1M tokens/day |
| **IP Intelligence**| IPQualityScore (VPN / Proxy detection) | [IPQualityScore](https://www.ipqualityscore.com) | 5,000 lookups/mo |
| **3DS OTP Step-Up**| JavaMailSender (SMTP) | [Mailtrap](https://mailtrap.io) (Dev) / Gmail (Prod) | Free sandbox / App Pass |

---

## 2. Environment Variables Checklist

All sensitive credentials and connection strings are parameterized via environment variables.

| Variable | Required In | Format / Example | Acquisition Source |
| :--- | :---: | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Both | `dev` or `prod` | Set `dev` for local Docker, `prod` for cloud |
| `DATABASE_URL` | Prod | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` | [Neon Console](https://console.neon.tech) → Dashboard |
| `DB_PASSWORD` | Local | e.g. `postgres` or `Siddiqui@407` | Local PostgreSQL password |
| `REDIS_URL` | Prod | `rediss://default:token@xyz.upstash.io:6379` | [Upstash Console](https://console.upstash.com) → Redis → Details |
| `KAFKA_BOOTSTRAP_SERVERS`| Prod | `xyz.upstash.io:9092` | [Upstash Console](https://console.upstash.com) → Kafka → Endpoints |
| `KAFKA_KEY` | Prod | `YWx...` (username) | Upstash Kafka credentials tab |
| `KAFKA_SECRET` | Prod | `V0q...` (password) | Upstash Kafka credentials tab |
| `JWT_SECRET` | Both | Minimum 32-char string (`openssl rand -base64 48`) | Self-generated securely |
| `GEMINI_API_KEY` | Both | `AIzaSy...` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GEMINI_MODEL` | Optional | `gemini-2.0-flash` (default) | Google AI Studio model directory |
| `IPQS_API_KEY` | Optional | 32-char alphanumeric key | [IPQualityScore](https://www.ipqualityscore.com/create-account) |
| `MAIL_HOST` | Both | `sandbox.smtp.mailtrap.io` (dev) / `smtp.gmail.com` | [Mailtrap.io](https://mailtrap.io) or Email provider |
| `MAIL_PORT` | Both | `2525` (dev) / `587` (prod) | SMTP provider documentation |
| `MAIL_USERNAME` | Both | SMTP username or email | Mailtrap account / Gmail address |
| `MAIL_PASSWORD` | Both | SMTP password or Google App Password | Mailtrap account / Google App Password |
| `OTP_ENABLED` | Both | `true` or `false` (default: `true`) | Feature flag for 3DS verification |
| `CORS_ORIGINS` | Both | `http://localhost:5173,https://your-app.vercel.app` | Comma-delimited allowed frontend URLs |
| `VITE_API_URL` | Frontend | `http://localhost:8080` or `https://backend.onrender.com` | Base backend API URL |

---

## 3. Spring Profile Management

FraudGuard uses a Dual Spring Profile architecture organized under `backend/src/main/resources/`:

- **`application.yml`**: Common baseline properties (server port 8080, Flyway migrations V1–V6, Hikari defaults, and profile switch `${SPRING_PROFILES_ACTIVE:dev}`).
- **`application-dev.yml`**: Configured for local development and local containers.
  - Connects to PostgreSQL at `localhost:5432` (`db/migration/V1__schema.sql` through `V6`).
  - Redis on `localhost:6379` (plaintext, non-TLS).
  - Kafka on `localhost:9092` with `PLAINTEXT` protocol (fails safe if unavailable).
  - Mailtrap sandbox for 3DS OTP email testing.
  - Verbose debug logging (`DEBUG` for FraudGuard engine, `DEBUG` for SQL queries).
- **`application-prod.yml`**: Configured for cloud managed datastores.
  - PostgreSQL datasource connecting via `${DATABASE_URL}` with `sslmode=require` and Hikari connection pool capped at 5 for Neon free tier.
  - Redis connecting via `${REDIS_URL}` with SSL/TLS explicitly active.
  - Kafka connecting via `${KAFKA_BOOTSTRAP_SERVERS}` with `SASL_SSL` protocol and `SCRAM-SHA-256` authentication using `${KAFKA_KEY}` and `${KAFKA_SECRET}`.
  - Strict secret validation with no hardcoded fallback values.
  - Clean production logging (`INFO` / `WARN` only, SQL output disabled).

### Switching Profiles
- **Locally:**
  ```bash
  # In terminal or launch configuration
  export SPRING_PROFILES_ACTIVE=dev   # Linux/macOS
  $env:SPRING_PROFILES_ACTIVE="dev"   # PowerShell
  ```
- **In Cloud Containers:**
  Set `SPRING_PROFILES_ACTIVE=prod` in your Render environment variables or container definition.

---

## 4. Local Deployment with Docker Compose

To test the entire 6-container production stack locally:

### Prerequisites
- Docker Engine & Docker Compose v2+
- Copy template variables:
  ```bash
  cp .env.example .env
  ```
  Fill in your `DB_PASSWORD`, `GEMINI_API_KEY`, and `JWT_SECRET`.

### Run the Stack
```bash
# Build and run all services in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# Inspect running containers
docker compose -f docker-compose.prod.yml ps

# View real-time logs from backend
docker compose -f docker-compose.prod.yml logs -f backend

# Stop the stack and preserve volumes
docker compose -f docker-compose.prod.yml down
```

The stack exposes:
- **Frontend SPA:** [http://localhost:5173](http://localhost:5173) (served via hardened Nginx Alpine with SPA rewrites & SSE proxy)
- **Backend API:** [http://localhost:8080](http://localhost:8080)
- **Actuator Health:** [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health)
- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`
- **Kafka:** `localhost:9092`

---

## 5. Free-Tier Cloud Deployment Guide

### Step 1: Provision Managed Datastores (Free Tier)
1. **Neon PostgreSQL:**
   - Create a free project at [neon.tech](https://neon.tech).
   - In Dashboard, select **Connection Details** and copy the pooled connection URI (`postgresql://...@ep-xyz.../neondb?sslmode=require`).
2. **Upstash Redis:**
   - Create a free Redis database at [upstash.com](https://upstash.com).
   - In Details tab, copy the **Node / Redis URL** (`rediss://default:...@...upstash.io:6379`).
3. **Upstash Kafka:**
   - Create a free Kafka cluster at [upstash.com](https://upstash.com).
   - Create the topic `fraudguard.events` (or let Spring Auto-Create).
   - In Credentials tab, copy the Bootstrap Server (`...upstash.io:9092`), Username (Key), and Password (Secret).

---

### Step 2: Deploy Backend to Render.com
Render provides a free Web Service container tier with 512 MB RAM.

1. Push your repository to GitHub.
2. Sign in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint** (or **Web Service** using `render.yaml`).
4. Select your FraudGuard repository. Render will automatically parse [render.yaml](render.yaml).
5. In the Environment Variables settings, fill in the secrets:
   - `SPRING_PROFILES_ACTIVE`: `prod`
   - `DATABASE_URL`: Your Neon connection string with `?sslmode=require`
   - `REDIS_URL`: Your Upstash Redis `rediss://` URL
   - `KAFKA_BOOTSTRAP_SERVERS`: Upstash Kafka host:port
   - `KAFKA_KEY`: Upstash Kafka Key
   - `KAFKA_SECRET`: Upstash Kafka Secret
   - `GEMINI_API_KEY`: Your Google AI Studio API key
   - `JWT_SECRET`: Random 256-bit string (or let Render auto-generate)
   - `CORS_ORIGINS`: Your Vercel frontend URL (e.g. `https://fraudguard.vercel.app`)
6. Deploy! Render will build the multi-stage Dockerfile and health check via `/actuator/health`.
7. Copy your deployed backend URL: `https://fraudguard-backend.onrender.com`.

---

### Step 3: Deploy Frontend to Vercel
1. Sign in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project** and import your GitHub repository.
3. Configure the Project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_URL`: Your Render backend URL (e.g. `https://fraudguard-backend.onrender.com`)
5. Deploy! Vercel will automatically apply [frontend/vercel.json](frontend/vercel.json) (SPA URL rewrites and HTTP security headers).
6. Copy your Vercel URL and add it to `CORS_ORIGINS` in your Render backend settings.

---

## 6. Verification & Health Check

After deployment, verify the platform health:

1. **Backend Health Check:**
   ```bash
   curl -s https://your-backend.onrender.com/actuator/health
   # Expected response: {"status":"UP"}
   ```
2. **Customer Portal Login:**
   - Navigate to your Vercel URL: `https://your-frontend.vercel.app/portal/login`
   - Sign in with demo credentials: `customer@fraudguard.io` / `demo1234`
   - Perform a checkout transaction and test the 3DS step-up verification.
3. **Analyst Dashboard Stream:**
   - Sign in at `/admin/login` with `analyst@fraudguard.io` / `demo1234`
   - Verify real-time SSE event streaming, syndicate graph visualization, and AI SAR generation.
