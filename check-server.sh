#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Checking RealtimeCursor server status...${NC}"

# Check if backend server is running
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ Backend server is running on port 3000${NC}"
    
    # Get more details about the server
    HEALTH_INFO=$(curl -s http://localhost:3000/health)
    echo -e "${BLUE}Server health info:${NC} $HEALTH_INFO"
else
    echo -e "${RED}✗ Backend server is not running on port 3000${NC}"
    echo -e "${YELLOW}Try starting the server with:${NC} ./start-dev.sh"
fi

# Check if frontend server is running
if curl -s http://localhost:5173 > /dev/null; then
    echo -e "${GREEN}✓ Frontend server is running on port 5173${NC}"
else
    echo -e "${RED}✗ Frontend server is not running on port 5173${NC}"
    echo -e "${YELLOW}Try starting the frontend with:${NC} cd realtime && npm run dev"
fi

echo -e "${BLUE}Done checking server status${NC}"