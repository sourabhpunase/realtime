#!/bin/bash

# Script to publish the RealtimeCursor SDK to npm

# Ensure we're in the SDK directory
cd "$(dirname "$0")"

# Build the SDK
echo "Building the SDK..."
npm run build

# Check if the build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Please fix the errors and try again."
  exit 1
fi

echo "Build successful!"

# Check if user is logged in to npm
echo "Checking npm login status..."
npm whoami > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "You are not logged in to npm. Please login:"
  npm login
else
  echo "You are already logged in to npm."
fi

# Confirm publishing
echo ""
echo "About to publish realtimecursor-sdk to npm."
echo "Package details:"
echo "----------------"
cat package.json | grep -E '"name"|"version"|"description"'
echo "----------------"
echo ""
read -p "Do you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Publish to npm
  echo "Publishing to npm..."
  npm publish
  
  if [ $? -eq 0 ]; then
    echo "Successfully published to npm!"
    echo "Your package is now available at: https://www.npmjs.com/package/realtimecursor-sdk"
  else
    echo "Failed to publish. Please check the error messages above."
  fi
else
  echo "Publishing cancelled."
fi