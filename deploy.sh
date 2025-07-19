#!/bin/bash

# Script to deploy RealtimeCursor to various platforms

# Function to display help
show_help() {
  echo "RealtimeCursor Deployment Script"
  echo "--------------------------------"
  echo "Usage: ./deploy.sh [option]"
  echo ""
  echo "Options:"
  echo "  render    Deploy to Render using render.yaml"
  echo "  docker    Build and run Docker container"
  echo "  manual    Instructions for manual deployment"
  echo "  help      Show this help message"
  echo ""
}

# Function to deploy to Render
deploy_render() {
  echo "Deploying to Render..."
  echo "1. Make sure you have pushed your code to GitHub"
  echo "2. Log in to your Render account at https://dashboard.render.com"
  echo "3. Click 'New' and select 'Blueprint'"
  echo "4. Connect your GitHub repository"
  echo "5. Render will automatically detect the render.yaml file"
  echo "6. Configure your environment variables"
  echo "7. Click 'Apply' to deploy"
  echo ""
  echo "Would you like to open the Render dashboard now? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    xdg-open https://dashboard.render.com &> /dev/null || open https://dashboard.render.com &> /dev/null || echo "Could not open browser automatically. Please visit https://dashboard.render.com"
  fi
}

# Function to deploy with Docker
deploy_docker() {
  echo "Deploying with Docker..."
  echo "Building Docker image..."
  docker build -t realtimecursor .
  
  if [ $? -ne 0 ]; then
    echo "Docker build failed. Please check the errors above."
    exit 1
  fi
  
  echo "Docker image built successfully!"
  echo ""
  echo "To run the container, use the following command:"
  echo "docker run -p 3000:3000 \\"
  echo "  -e SUPABASE_URL=your_supabase_url \\"
  echo "  -e SUPABASE_KEY=your_supabase_key \\"
  echo "  -e JWT_SECRET=your_jwt_secret \\"
  echo "  realtimecursor"
  echo ""
  echo "Would you like to run the container now with default settings? (y/n)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Running Docker container..."
    docker run -p 3000:3000 -e JWT_SECRET=dev_secret realtimecursor
  fi
}

# Function for manual deployment instructions
manual_deploy() {
  echo "Manual Deployment Instructions"
  echo "------------------------------"
  echo "1. Build the frontend:"
  echo "   cd realtime"
  echo "   npm install"
  echo "   npm run build"
  echo ""
  echo "2. Set up the backend:"
  echo "   cd .."
  echo "   npm install"
  echo ""
  echo "3. Create a .env file with the following variables:"
  echo "   SUPABASE_URL=your_supabase_url"
  echo "   SUPABASE_KEY=your_supabase_key"
  echo "   JWT_SECRET=your_jwt_secret"
  echo "   PORT=3000"
  echo "   FRONTEND_URL=https://your-frontend-domain.com"
  echo ""
  echo "4. Start the server:"
  echo "   For development: npm start"
  echo "   For production with PM2:"
  echo "   npm install -g pm2"
  echo "   pm2 start api/server.js --name realtimecursor"
  echo "   pm2 save"
  echo "   pm2 startup"
  echo ""
}

# Main script logic
if [ "$1" = "render" ]; then
  deploy_render
elif [ "$1" = "docker" ]; then
  deploy_docker
elif [ "$1" = "manual" ]; then
  manual_deploy
elif [ "$1" = "help" ] || [ -z "$1" ]; then
  show_help
else
  echo "Invalid option: $1"
  show_help
  exit 1
fi