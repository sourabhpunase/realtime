#!/bin/bash

# Script to build and run RealtimeCursor with Docker

echo "RealtimeCursor Docker Deployment Helper"
echo "======================================"
echo ""

# Generate a random JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT Secret: $JWT_SECRET"
echo ""

# Update docker-compose.yml with the JWT secret
sed -i "s/your_jwt_secret_here/$JWT_SECRET/g" docker-compose.yml

echo "Building and starting RealtimeCursor..."
echo "This may take a few minutes..."
echo ""

# Build and run with docker-compose
docker-compose up -d --build

echo ""
echo "RealtimeCursor should now be running!"
echo "Access it at: http://localhost:3000"
echo ""
echo "To check logs: docker-compose logs -f"
echo "To stop: docker-compose down"