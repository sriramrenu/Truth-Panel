# Truth Panel: Enterprise Survey & Rewards Platform

Truth Panel is a production-hardened, high-concurrency survey management system built for TATA-grade reliability. It features a stateless JWT architecture, distributed background processing, and real-time observability.

---

## 🚀 Quick Start (Production Mode)

The entire stack is containerized and ready for one-command deployment.

```bash
# 1. Start the full infrastructure
docker compose up --build -d

# 2. Run database migrations (Handled automatically via Flyway)
# 3. Access the platform
# Frontend: http://localhost:3000
# API Health: http://localhost:5000/health
```

---

## 🛠 Tech Stack & Architecture

- **Core**: Next.js (Frontend) + Express.js (Backend)
- **Database**: PostgreSQL (Permanent Ledger) + Redis (High-speed Cache/Queues)
- **Background Engine**: BullMQ (Distributed Task Orchestration)
- **Security**: Stateless JWT + RBAC (Role-Based Access Control)
- **Observability**: Prometheus + Loki + Grafana

---

## 📊 Observability Stack (Internal Only)

Monitor the heartbeat of the platform in real-time:

- **Grafana Dashboard**: [http://localhost:3200](http://localhost:3200)
  - *Default Credentials: `admin` / `SecureAdminTATA@2024`*
- **Metrics (Prometheus)**: [http://localhost:9090](http://localhost:9090)
- **Logs (Loki)**: Integrated into the Grafana Explore view.

---

## 🏗 Key Features

1.  **Distributed Scheduler**: background tasks (like leaderboard refreshes) run with a distributed lock, preventing conflicts across multiple server instances.
2.  **Stateless Session Layer**: High-scale progress tracking that survives server restarts.
3.  **Atomic Transactions**: All survey and reward operations use SQL `BEGIN/COMMIT` blocks for zero data loss.
4.  **Partitioned Responses**: The system is pre-configured for multi-year scale using PostgreSQL Table Partitioning.

---

**Welcome to the future of data-driven insights. Welcome to Truth Panel.** 🏁
