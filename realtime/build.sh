#!/bin/bash

# Frontend build script for Render

echo "Starting frontend build process..."

# Navigate to the frontend directory
cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
  echo "Build successful! dist directory created."
  ls -la dist
else
  echo "ERROR: Build failed! dist directory not created."
  echo "Current directory contents:"
  ls -la
  exit 1
fi