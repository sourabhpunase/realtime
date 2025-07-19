#!/bin/bash

# Frontend-only build script for Render

echo "Installing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Frontend build completed!"