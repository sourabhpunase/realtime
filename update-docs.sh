#!/bin/bash

# Script to update documentation links after deployment

# Function to display help
show_help() {
  echo "RealtimeCursor Documentation Update Script"
  echo "-----------------------------------------"
  echo "Usage: ./update-docs.sh [api_url] [socket_url]"
  echo ""
  echo "Arguments:"
  echo "  api_url     The URL of your deployed API (e.g., https://realtimecursor-api.onrender.com)"
  echo "  socket_url  The URL of your socket server (usually the same as api_url)"
  echo ""
  echo "Example:"
  echo "  ./update-docs.sh https://realtimecursor-api.onrender.com https://realtimecursor-api.onrender.com"
  echo ""
}

# Check if arguments are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  show_help
  exit 1
fi

API_URL=$1
SOCKET_URL=$2

echo "Updating documentation with the following URLs:"
echo "API URL: $API_URL"
echo "Socket URL: $SOCKET_URL"
echo ""

# Update SDK README.md
echo "Updating SDK README.md..."
sed -i "s|apiUrl: 'https://your-realtimecursor-api.com'|apiUrl: '$API_URL'|g" sdk/README.md
sed -i "s|socketUrl: 'https://your-realtimecursor-api.com'|socketUrl: '$SOCKET_URL'|g" sdk/README.md

# Update main README.md
echo "Updating main README.md..."
sed -i "s|https://your-realtimecursor-api.com|$API_URL|g" README.md

# Update landing page if it exists
if [ -f "landing/index.html" ]; then
  echo "Updating landing page..."
  sed -i "s|https://your-realtimecursor-api.com|$API_URL|g" landing/index.html
fi

# Update docs page if it exists
if [ -f "landing/docs.html" ]; then
  echo "Updating docs page..."
  sed -i "s|https://your-realtimecursor-api.com|$API_URL|g" landing/docs.html
fi

echo "Documentation updated successfully!"
echo ""
echo "Next steps:"
echo "1. Commit and push these changes to your repository"
echo "2. If you've already published the SDK, consider publishing a new version"
echo "   with the updated documentation using: cd sdk && ./publish.sh"
echo ""