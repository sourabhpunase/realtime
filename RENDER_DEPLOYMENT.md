# Deploying RealtimeCursor to Render

This guide will walk you through the process of deploying RealtimeCursor to Render.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at https://render.com if you don't have one)
3. A Supabase account (optional, for database functionality)

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Name your repository `realtimecursor`
3. Make it public or private as per your preference
4. Click "Create repository"
5. Copy the repository URL (e.g., `https://github.com/yourusername/realtimecursor.git`)

## Step 2: Push Your Code to GitHub

Run the following command in your terminal:

```bash
./push-to-github.sh https://github.com/yourusername/realtimecursor.git
```

Replace `yourusername` with your actual GitHub username.

## Step 3: Deploy to Render

1. Go to https://dashboard.render.com
2. Sign in or create an account
3. Click "New" and select "Blueprint"
4. Connect your GitHub account if you haven't already
5. Select the `realtimecursor` repository
6. Render will automatically detect the `render.yaml` file
7. Configure the following environment variables:
   - `JWT_SECRET`: Render will generate this automatically
   - `SUPABASE_URL`: Your Supabase URL (optional)
   - `SUPABASE_KEY`: Your Supabase service role key (optional)
8. Click "Apply" to deploy

## Step 4: Monitor Deployment

1. Render will start building and deploying your services
2. You can monitor the progress in the Render dashboard
3. Once deployment is complete, you'll see "Live" status for both services

## Step 5: Access Your Application

1. Click on the `realtimecursor-frontend` service in the Render dashboard
2. Click on the URL to access your application
3. You should see the RealtimeCursor landing page

## Step 6: Update Documentation Links

After deployment, update your documentation with the correct URLs:

```bash
./update-docs.sh https://realtimecursor-api.onrender.com https://realtimecursor-api.onrender.com
```

Replace the URLs with your actual Render URLs.

## Step 7: Create Default Admin Users

1. Access your API service at `https://realtimecursor-api.onrender.com/create-default-admins`
2. This will create the default superadmin and admin users:
   - Superadmin: `superadmin@example.com` / `SuperAdmin123!`
   - Admin: `admin@example.com` / `Admin123!`

## Step 8: Log In and Start Using RealtimeCursor

1. Go to your frontend URL (e.g., `https://realtimecursor-frontend.onrender.com`)
2. Log in with the superadmin credentials
3. Start creating projects and inviting users

## Troubleshooting

If you encounter any issues during deployment:

1. Check the build logs in the Render dashboard
2. Ensure all environment variables are correctly set
3. Verify that your Supabase instance is accessible (if using Supabase)
4. Check the application logs for any runtime errors

For more detailed deployment options, refer to the [Deployment Guide](./DEPLOYMENT.md).