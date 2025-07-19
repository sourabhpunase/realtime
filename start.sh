#!/bin/bash

echo "Starting Real-time Collaboration System..."

# Kill any existing processes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Start backend server
echo "Starting backend server..."
cd api && node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../realtime && npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "🚀 System is starting up..."
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:3000"
echo ""
echo "Default Superadmin Login:"
echo "Email: superadmin@example.com"
echo "Password: SuperAdmin123!"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait