#!/usr/bin/env bash

echo "Stopping old frontend servers..."
pkill -f "python3 -m http.server 8080 --directory public_dashboard" || true
pkill -f "python3 -m http.server 8081 --directory public_dashboard" || true
sleep 1

PORT=8080
if lsof -i :8080 >/dev/null 2>&1; then
  PORT=8081
fi

echo "Starting frontend on port $PORT ..."
nohup python3 -m http.server "$PORT" --directory public_dashboard >/tmp/signaldesk-frontend.log 2>&1 &
sleep 1

echo
echo "Frontend log:"
cat /tmp/signaldesk-frontend.log 2>/dev/null || true
echo
echo "Open:"
echo "http://127.0.0.1:$PORT"
