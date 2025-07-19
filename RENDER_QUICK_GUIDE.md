# RealtimeCursor Deployment Guide

## Step 1: Deploy to Render

1. Go to the [Render dashboard](https://dashboard.render.com)
2. Click "New" and select "Blueprint"
3. Connect your GitHub account if you haven't already
4. Select the `realtime` repository
5. Render will automatically detect the `render.yaml` file
6. Configure the environment variables:
   - `JWT_SECRET`: Render will generate this automatically
   - `SUPABASE_URL`: Your Supabase URL (optional)
   - `SUPABASE_KEY`: Your Supabase service role key (optional)
7. Click "Apply" to deploy

## Step 2: Monitor Deployment

1. Render will start building and deploying your services
2. You can monitor the progress in the Render dashboard
3. Once deployment is complete, you'll see "Live" status for both services

## Step 3: Update Documentation Links

After deployment, update your documentation with the correct URLs:

```bash
./update-docs.sh https://realtimecursor-api.onrender.com https://realtimecursor-api.onrender.com
```

Replace the URLs with your actual Render URLs.

## Step 4: Create Default Admin Users

1. Access your API service at `https://realtimecursor-api.onrender.com/create-default-admins`
2. This will create the default superadmin and admin users:
   - Superadmin: `superadmin@example.com` / `SuperAdmin123!`
   - Admin: `admin@example.com` / `Admin123!`

## Step 5: Log In and Start Using RealtimeCursor

1. Go to your frontend URL (e.g., `https://realtimecursor-frontend.onrender.com`)
2. Log in with the superadmin credentials
3. Start creating projects and inviting users

## Troubleshooting

If you encounter any issues during deployment:

1. Check the build logs in the Render dashboard
2. Ensure all environment variables are correctly set
3. Verify that your Supabase instance is accessible (if using Supabase)
4. Check the application logs for any runtime errors