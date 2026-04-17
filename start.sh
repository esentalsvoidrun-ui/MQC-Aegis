#!/bin/bash

echo "🔧 Cleaning old ports..."

# Döda ev gamla processer
kill -9 $(lsof -t -i:3000) 2>/dev/null
kill -9 $(lsof -t -i:3001) 2>/dev/null
kill -9 $(lsof -t -i:3002) 2>/dev/null

sleep 1

echo "🚀 Starting SignalDesk..."

# Starta huvudserver
cd ~/audit-dashboard
npm start &
SERVER_PID=$!

# Starta WebSocket
node live-ws.js &
WS_PID=$!

sleep 2

echo ""
echo "✅ SignalDesk LIVE"
echo "🌐 App: http://localhost:3000 (eller 3001)"
echo "⚡ WS:  ws://localhost:3002"
echo ""
echo "Tryck CTRL+C för att stänga allt"

# Vänta och stäng allt snyggt
trap "echo '🛑 Stänger...'; kill $SERVER_PID $WS_PID 2>/dev/null; exit" INT

wait
