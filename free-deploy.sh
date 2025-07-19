#!/bin/bash

# Script to help with free deployment on Render

echo "RealtimeCursor Free Deployment Helper"
echo "===================================="
echo ""

# Generate a random JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT Secret: $JWT_SECRET"
echo "Save this for your Render environment variables!"
echo ""

# Commit and push changes
echo "Committing and pushing changes..."
git add .
git commit -m "Prepare for free deployment on Render"
git push origin master

echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Create a Web Service for the backend (see FREE_DEPLOYMENT.md)"
echo "3. Create a Static Site for the frontend (see FREE_DEPLOYMENT.md)"
echo "4. Use the JWT_SECRET generated above for your backend environment variables"
echo ""
echo "For detailed instructions, see FREE_DEPLOYMENT.md"