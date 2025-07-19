#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
TOKEN=""

echo -e "${BLUE}Testing RealtimeCursor API endpoints...${NC}"

# Test health endpoint
echo -e "\n${YELLOW}Testing health endpoint...${NC}"
curl -s $API_URL/health | jq .

# Login as superadmin
echo -e "\n${YELLOW}Logging in as superadmin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"SuperAdmin123!"}')

echo $LOGIN_RESPONSE | jq .

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
  echo -e "${GREEN}✓ Successfully logged in and got token${NC}"
  
  # Test getting current user
  echo -e "\n${YELLOW}Getting current user...${NC}"
  curl -s -H "Authorization: Bearer $TOKEN" $API_URL/auth/me | jq .
  
  # Test getting projects
  echo -e "\n${YELLOW}Getting projects...${NC}"
  curl -s -H "Authorization: Bearer $TOKEN" $API_URL/projects | jq .
  
  # Test creating a project
  echo -e "\n${YELLOW}Creating a test project...${NC}"
  PROJECT_RESPONSE=$(curl -s -X POST $API_URL/projects \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name":"Test Project","description":"A test project created via API"}')
  
  echo $PROJECT_RESPONSE | jq .
  
  # Extract project ID
  PROJECT_ID=$(echo $PROJECT_RESPONSE | jq -r '.project.id')
  
  if [ "$PROJECT_ID" != "null" ] && [ "$PROJECT_ID" != "" ]; then
    echo -e "${GREEN}✓ Successfully created project with ID: $PROJECT_ID${NC}"
    
    # Test getting project details
    echo -e "\n${YELLOW}Getting project details...${NC}"
    curl -s -H "Authorization: Bearer $TOKEN" $API_URL/projects/$PROJECT_ID | jq .
    
    # Test updating project content
    echo -e "\n${YELLOW}Updating project content...${NC}"
    curl -s -X PUT $API_URL/projects/$PROJECT_ID/content \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"content":"# Test Content\n\nThis is a test content for the project."}' | jq .
    
    # Test getting project history
    echo -e "\n${YELLOW}Getting project history...${NC}"
    curl -s -H "Authorization: Bearer $TOKEN" $API_URL/projects/$PROJECT_ID/history | jq .
  else
    echo -e "${RED}✗ Failed to create project${NC}"
  fi
else
  echo -e "${RED}✗ Failed to login${NC}"
fi

echo -e "\n${BLUE}API testing complete${NC}"