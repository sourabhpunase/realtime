#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting RealtimeCursor Development Environment${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed. Please install Node.js to continue.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm is not installed. Please install npm to continue.${NC}"
    exit 1
fi

# Function to check if a port is in use
is_port_in_use() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Check if ports are available
if is_port_in_use 3000; then
    echo -e "${YELLOW}Port 3000 is already in use. Please close the application using this port.${NC}"
    exit 1
fi

if is_port_in_use 5173; then
    echo -e "${YELLOW}Port 5173 is already in use. Please close the application using this port.${NC}"
    exit 1
fi

# Install dependencies if needed
echo -e "${BLUE}Checking backend dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
else
    echo -e "${GREEN}Backend dependencies already installed.${NC}"
fi

echo -e "${BLUE}Checking frontend dependencies...${NC}"
if [ ! -d "realtime/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd realtime && npm install && cd ..
else
    echo -e "${GREEN}Frontend dependencies already installed.${NC}"
fi

# Start backend server in background
echo -e "${BLUE}Starting backend server on port 3000...${NC}"
npm start &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}Waiting for backend server to start...${NC}"
sleep 3

# Start frontend server in background
echo -e "${BLUE}Starting frontend server on port 5173...${NC}"
cd realtime && npm run dev &
FRONTEND_PID=$!

# Function to handle script termination
cleanup() {
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Servers stopped.${NC}"
    exit 0
}

# Register the cleanup function for script termination
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}RealtimeCursor is running!${NC}"
echo -e "${BLUE}Backend:${NC} http://localhost:3000"
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo -e "${GREEN}=====================================${NC}"

# Keep the script running
wait