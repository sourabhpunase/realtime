#!/bin/bash

echo "🚀 Starting Collaboration System..."
echo ""

# Check if we're in the right directory
if [ ! -f "COLLABORATION_FEATURES.md" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Start backend server in background
echo "📡 Starting backend server..."
cd api
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

echo "🌐 Backend server started (PID: $BACKEND_PID)"
echo ""

# Start frontend server
echo "🎨 Starting frontend server..."
cd realtime
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Frontend server started (PID: $FRONTEND_PID)"
echo ""

echo "🎉 Collaboration system is now running!"
echo ""
echo "📋 Access URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo ""
echo "🔑 Default Login Credentials:"
echo "   Admin:      admin@example.com / Admin123!"
echo "   SuperAdmin: superadmin@example.com / SuperAdmin123!"
echo ""
echo "🧪 To test the system:"
echo "   node test-collaboration.js"
echo ""
echo "⏹️  To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script running
wait