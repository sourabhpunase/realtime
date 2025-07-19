#!/bin/bash
echo "🔄 Restarting server..."
pkill -f "node server.js"
sleep 2
cd /home/sourabhpunase/Desktop/realtimecursor/api
npm start