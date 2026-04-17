# Truth Panel

Truth Panel is a unified application comprising an Express.js backend API and a powerful Next.js React frontend. The application utilizes PostgreSQL for data persistence and a Redis-backed background job queue (via BullMQ).

## Architecture
The application has recently migrated away from serverless Vercel deployments and has been containerized natively for **Northflank**.
We employ a **Unified Container Strategy**:
- 🐳 **`Dockerfile`**: Builds a single, unified Node 20 alpine image.
- 🚀 **`start.sh`**: Acts as the entry point script, launching the Express backend on `5000` (background) while spinning up the Next.js frontend on `3000` (foreground).
- 🔀 **Next.js Rewrites**: The frontend transparently intercepts API requests (`/api/...`) and routes them locally pointing to your backend so that you avoid CORS issues entirely and only expose a single port.

## Authentication
The platform securely utilizes a dual JWT token system. The server mints an **Access Token** (15-minute expiry) and a **Refresh Token** (7-day expiry). 

The frontend gracefully intercepts any 401 Unauthorized errors from the API due to token expiration, redeems a new access token via `/api/auth/refresh`, and transparently replays the original request on behalf of the user.

## Running Locally

To work on this repository locally, you should be spinning up both services parallelly:

```bash
# 1. Install Dependencies
npm install

# 2. Setup your .env file
# Ensure you have DATABASE_URL, REDIS_URL, BREVO configuration, JWT_SECRET, etc.
# Check out .env.example (or the provided .env) for details.

# 3. Start Backend manually
npm run dev:backend

# 4. In a separate terminal, Start Frontend
npm run dev
```

Alternatively, you can test the production Docker layout right away:
```bash
docker build -t truth-panel .
docker run -p 3000:3000 truth-panel
```

## Hosted Deployment (Northflank)
1. Add this repository directly to Northflank as a Service.
2. Select your `Dockerfile` as the build context.
3. Configure the container to bind to port **3000** over HTTP.
4. Supply your runtime Secrets/Variables via the Northflank environment panel.
