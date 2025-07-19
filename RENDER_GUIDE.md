# Render Deployment Guide

This guide will help you deploy RealtimeCursor on Render's free tier.

## Step 1: Deploy Backend API

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: realtimecursor-api
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variables:
   - `JWT_SECRET`: (generate a random string or use: `openssl rand -base64 32`)
   - `NODE_ENV`: production
6. Click "Create Web Service"

## Step 2: Deploy Frontend

1. In Render Dashboard, click "New" and select "Static Site"
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: realtimecursor-frontend
   - **Build Command**: `cd realtime && npm install && npm run build`
   - **Publish Directory**: `realtime/dist`
   - **Plan**: Free
4. Add environment variables:
   - `VITE_API_URL`: (Your backend URL from Step 1, e.g., https://realtimecursor-api.onrender.com)
5. Click "Create Static Site"

## Step 3: Create Default Admin Users

After deployment:

1. Visit `https://realtimecursor-api.onrender.com/create-default-admins`
2. This will create:
   - Superadmin: `superadmin@example.com` / `SuperAdmin123!`
   - Admin: `admin@example.com` / `Admin123!`

## Step 4: Access Your Application

1. Go to your frontend URL (e.g., `https://realtimecursor-frontend.onrender.com`)
2. Log in with the superadmin credentials

## Troubleshooting

If you encounter build errors:

1. Check the build logs in the Render dashboard
2. Try using the simplified build command: `npm install && cd realtime && npm install && npm run build`
3. Make sure your Node.js version is compatible (Render uses Node 14 by default)
4. If npm ci fails, use npm install instead