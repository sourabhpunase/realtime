# Separate Deployment Guide for Render

This guide explains how to deploy the backend and frontend separately on Render.

## Step 1: Deploy Backend API

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: realtimecursor-api
   - **Root Directory**: / (leave empty)
   - **Runtime**: Node
   - **Build Command**: `chmod +x ./backend-build.sh && ./backend-build.sh`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variables:
   - `JWT_SECRET`: (generate a random string or use: `openssl rand -base64 32`)
   - `NODE_ENV`: production
   - `FRONTEND_URL`: (leave empty for now, we'll update after frontend deployment)
6. Click "Create Web Service"
7. Note the URL of your backend service (e.g., https://realtimecursor-api.onrender.com)

## Step 2: Deploy Frontend

1. In Render Dashboard, click "New" and select "Static Site"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: realtimecursor-frontend
   - **Root Directory**: realtime
   - **Build Command**: `chmod +x ./frontend-build.sh && ./frontend-build.sh`
   - **Publish Directory**: dist
   - **Plan**: Free
4. Add environment variables:
   - `VITE_API_URL`: (Your backend URL from Step 1, e.g., https://realtimecursor-api.onrender.com)
5. Click "Create Static Site"
6. Note the URL of your frontend service (e.g., https://realtimecursor-frontend.onrender.com)

## Step 3: Update Backend CORS Settings

1. Go back to your backend service in Render dashboard
2. Add/update environment variable:
   - `FRONTEND_URL`: (Your frontend URL from Step 2, e.g., https://realtimecursor-frontend.onrender.com)
3. Click "Save Changes"
4. This will trigger a redeploy of your backend with the updated CORS settings

## Step 4: Create Default Admin Users

1. Visit `https://realtimecursor-api.onrender.com/create-default-admins`
2. This will create:
   - Superadmin: `superadmin@example.com` / `SuperAdmin123!`
   - Admin: `admin@example.com` / `Admin123!`

## Step 5: Access Your Application

1. Go to your frontend URL (e.g., `https://realtimecursor-frontend.onrender.com`)
2. Log in with the superadmin credentials

## Troubleshooting

If you encounter CORS issues:
1. Make sure the FRONTEND_URL environment variable in the backend service is set correctly
2. Check that the VITE_API_URL environment variable in the frontend service is set correctly
3. Verify that both services are deployed and running