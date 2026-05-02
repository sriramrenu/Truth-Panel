
echo "Booting Unified Truth Panel Services..."

# Handle termination signals
_term() { 
  echo "Caught signal! Terminating child processes..."
  kill -TERM "$api_pid" 2>/dev/null
  kill -TERM "$frontend_pid" 2>/dev/null
  exit 0
}

trap _term SIGTERM SIGINT

# 1. Start backend server
echo "Starting Express API Backend on port $API_PORT..."
NODE_ENV=production PORT=$API_PORT node app/backend/server.js &
api_pid=$!

# 2. Wait for API health
echo "Waiting for API to stabilize..."
sleep 3

# 3. Start frontend server
echo "Starting Next.js Frontend on port $APP_PORT..."
NODE_ENV=production PORT=$APP_PORT npm run start &
frontend_pid=$!

# Monitor processes
# If either dies, the container should exit to trigger a Docker restart
wait -n

echo "One of the processes exited unexpectedly. Shutting down container..."
_term
