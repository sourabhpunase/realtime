# Frontend Deployment Guide for Render

This guide will help you deploy the frontend on Render's free tier.

## Option 1: Deploy as a Static Site (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" and select "Static Site"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: realtimecursor-frontend
   - **Root Directory**: realtime
   - **Build Command**: `chmod +x ./build.sh && ./build.sh`
   - **Publish Directory**: dist
   - **Plan**: Free
5. Add environment variables:
   - `VITE_API_URL`: (Your backend URL, e.g., https://realtime-1.onrender.com)
6. Click "Create Static Site"

## Option 2: Deploy Static HTML Directly (Fallback)

If the build process fails, you can use this simpler approach:

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" and select "Static Site"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: realtimecursor-frontend
   - **Root Directory**: realtime/public
   - **Build Command**: (leave empty)
   - **Publish Directory**: .
   - **Plan**: Free
5. Add environment variables:
   - `VITE_API_URL`: (Your backend URL, e.g., https://realtime-1.onrender.com)
6. Click "Create Static Site"

## Troubleshooting

If you encounter build errors:

1. Check the build logs in the Render dashboard
2. Try Option 2 (Deploy Static HTML Directly)
3. Make sure your Node.js version is compatible (Render uses Node 14 by default)
4. Check if there are any dependency issues in package.json