#!/bin/bash

# Script to push RealtimeCursor to GitHub and deploy to Render

# Check if GitHub repository URL is provided
if [ -z "$1" ]; then
  echo "Please provide your GitHub repository URL"
  echo "Usage: ./push-to-github.sh https://github.com/yourusername/realtimecursor.git"
  exit 1
fi

GITHUB_REPO=$1

# Add GitHub remote
echo "Adding GitHub remote..."
git remote add origin $GITHUB_REPO

# Push to GitHub
echo "Pushing to GitHub..."
git push -u origin master

# Check if push was successful
if [ $? -eq 0 ]; then
  echo "Successfully pushed to GitHub!"
  echo ""
  echo "Next steps to deploy to Render:"
  echo "1. Go to https://dashboard.render.com"
  echo "2. Click 'New' and select 'Blueprint'"
  echo "3. Connect your GitHub repository"
  echo "4. Render will automatically detect the render.yaml file"
  echo "5. Configure your environment variables"
  echo "6. Click 'Apply' to deploy"
  echo ""
  echo "Would you like to open the Render dashboard now? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    xdg-open https://dashboard.render.com &> /dev/null || open https://dashboard.render.com &> /dev/null || echo "Could not open browser automatically. Please visit https://dashboard.render.com"
  fi
else
  echo "Failed to push to GitHub. Please check the error messages above."
fi