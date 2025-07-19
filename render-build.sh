#!/bin/bash

# This script is used by Render to build the application

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd realtime
npm install

echo "Building frontend..."
npm run build
cd ..

echo "Build completed successfully!"