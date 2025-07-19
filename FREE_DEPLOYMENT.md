# Free Deployment Guide for RealtimeCursor

This guide will help you deploy RealtimeCursor using Render's free tier.

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
   - `PORT`: 10000
   - `NODE_ENV`: production
   - `JWT_SECRET`: (generate a random string)
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

## Step 3: Update CORS Settings

Since you're using separate domains for frontend and backend, you need to update CORS settings:

1. Edit `/api/server.js` to allow requests from your frontend domain
2. Commit and push the changes

## Step 4: Create Default Admin Users

After deployment:

1. Visit `https://realtimecursor-api.onrender.com/create-default-admins`
2. This will create:
   - Superadmin: `superadmin@example.com` / `SuperAdmin123!`
   - Admin: `admin@example.com` / `Admin123!`

## Step 5: Access Your Application

1. Go to your frontend URL (e.g., `https://realtimecursor-frontend.onrender.com`)
2. Log in with the superadmin credentials

## Limitations of Free Tier

- Services on the free tier will spin down after 15 minutes of inactivity
- Initial request after inactivity may take up to 30 seconds to respond
- Limited bandwidth and usage
- No custom domains

## Troubleshooting

If you encounter issues:
1. Check the logs in the Render dashboard
2. Ensure environment variables are correctly set
3. Verify CORS settings if frontend can't connect to backend