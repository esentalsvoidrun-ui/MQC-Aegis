#!/usr/bin/env bash
pkill -f "node src/server.js" || true
sleep 1
nohup node ~/audit-dashboard/src/server.js > /tmp/signaldesk.log 2>&1 &
sleep 1
cat /tmp/signaldesk.log
