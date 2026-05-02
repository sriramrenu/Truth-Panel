# Truth Panel

Truth Panel is a unified application comprising an Express.js backend API and a powerful Next.js React frontend. The application utilizes PostgreSQL for data persistence and a Redis-backed background job queue (via BullMQ).

## Architecture
The application has recently migrated away from serverless Vercel deployments and has been containerized natively for **Northflank**.
We employ a **Unified Container Strategy**:
- 🐳 **`Dockerfile`**: Builds a single, unified Node 20 alpine image.
- 🚀 **`start.sh`**: Acts as the entry point script, launching the Express backend (port defined by `API_PORT`) and the Next.js frontend (port defined by `APP_PORT`).
- 🔀 **Next.js Rewrites**: The frontend transparently intercepts API requests (`/api/...`) and routes them locally pointing to your backend so that you avoid CORS issues entirely and only expose a single port.

## Authentication
The platform securely utilizes a dual JWT token system. The server mints an **Access Token** (15-minute expiry) and a **Refresh Token** (7-day expiry). 

The frontend gracefully intercepts any 401 Unauthorized errors from the API due to token expiration, redeems a new access token via `/api/auth/refresh`, and transparently replays the original request on behalf of the user.

## Running Locally

1. Create a `.env` file based on the environment variables defined in your orchestration panel.
2. Build and start the services:
```bash
docker-compose up -d --build
```

Alternatively, you can test the production Docker layout right away:
```bash
docker build -t truth-panel .
docker run -p ${APP_PORT}:${APP_PORT} truth-panel
```

## Hosted Deployment (Northflank)

1. Connect your GitHub repository to Northflank.
2. Select your `Dockerfile` as the build context.
3. Configure the container to bind to port **${APP_PORT}** over HTTP.
4. Supply your runtime Secrets/Variables via the Northflank environment panel.
