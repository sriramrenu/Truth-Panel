#!/bin/sh

echo "Booting Unified Truth Panel Services..."

# 1. Start backend server (listening on 5000 implicitly or explicitly)
echo "Starting Express API Backend on port 5000..."
PORT=5000 node app/backend/server.js &

# 2. Wait a moment to ensure API is up
sleep 2

# 3. Start frontend server
echo "Starting Next.js Frontend on port 3000..."
npm run start
