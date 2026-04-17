#!/usr/bin/env bash
cd ~/audit-dashboard || exit 1
pkill -f "node src/server.js" || true
sleep 1
fuser -k 3000/tcp 2>/dev/null || true
nohup node src/server.js > /tmp/signaldesk.log 2>&1 &
sleep 2
echo "===== LOG ====="
cat /tmp/signaldesk.log
echo
echo "===== HEALTH ====="
curl -s http://localhost:3000/health
echo
