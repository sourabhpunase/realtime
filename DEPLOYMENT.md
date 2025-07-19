# Comprehensive Deployment Guide for RealtimeCursor

This guide provides detailed instructions for deploying RealtimeCursor as a SaaS platform or for self-hosting.

## Prerequisites

- Node.js 16+ installed
- Git
- A Supabase account (or another PostgreSQL database)
- NPM or Yarn
- Docker (optional)
- Render account (optional)

## Option 1: Deploy to Render (Recommended for SaaS)

Render provides a simple way to deploy both the backend and frontend with automatic SSL, CDN, and scaling.

### Step 1: Fork the Repository

Fork this repository to your GitHub account.

### Step 2: Create a Render Account

Sign up for a [Render](https://render.com) account if you don't have one.

### Step 3: Connect Your GitHub Repository

1. In Render dashboard, click "New" and select "Blueprint"
2. Connect your GitHub account and select your forked repository
3. Render will automatically detect the `render.yaml` file and set up the services

### Step 4: Configure Environment Variables

Set the following environment variables in the Render dashboard:

- `SUPABASE_URL`: Your Supabase URL
- `SUPABASE_KEY`: Your Supabase service role key
- `JWT_SECRET`: A secure random string for JWT token signing (or let Render generate one)

### Step 5: Deploy

Click "Apply" to deploy the services. Render will automatically build and deploy both the backend API and frontend.

## Option 2: Deploy with Docker

Docker provides a consistent deployment environment across different platforms.

### Step 1: Build the Docker Image

```bash
docker build -t realtimecursor .
```

### Step 2: Run the Container

```bash
docker run -p 3000:3000 \
  -e SUPABASE_URL=your_supabase_url \
  -e SUPABASE_KEY=your_supabase_key \
  -e JWT_SECRET=your_jwt_secret \
  realtimecursor
```

### Step 3: Set Up Nginx for the Frontend (Optional)

If you want to serve the frontend separately:

```bash
# Build the frontend
cd realtime
npm install
npm run build

# Copy the build to your web server
cp -r dist/* /var/www/html/
```

## Option 3: Manual Deployment

For complete control over your deployment environment.

### Step 1: Build the Frontend

```bash
cd realtime
npm install
npm run build
```

### Step 2: Set Up the Backend

```bash
cd ..
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
```

### Step 4: Start the Server

For development:
```bash
npm start
```

For production with PM2:
```bash
npm install -g pm2
pm2 start api/server.js --name realtimecursor
pm2 save
pm2 startup
```

## Publishing the SDK

To make the SDK available for your users:

### Step 1: Prepare the SDK

```bash
cd sdk
npm install
npm run build
```

### Step 2: Publish to npm

```bash
cd sdk
npm login
npm publish
```

### Step 3: Update Documentation

Update your documentation to include installation instructions:

```bash
npm install realtimecursor-sdk
```

## Setting Up as a SaaS

To set up RealtimeCursor as a SaaS business:

### Step 1: Deploy the Platform

Deploy using one of the methods above.

### Step 2: Set Up a Custom Domain

1. Purchase a domain name
2. Configure DNS settings to point to your deployment
3. Set up SSL certificates (automatic with Render)

### Step 3: Create a Pricing Page

1. Define your pricing tiers (e.g., Free, Pro, Enterprise)
2. Implement a payment processing system (Stripe recommended)
3. Create subscription management UI

### Step 4: Implement Usage Tracking

1. Track API calls, active users, and projects
2. Set up usage limits based on subscription tier
3. Implement rate limiting to prevent abuse

### Step 5: User Management Dashboard

1. Create a dashboard for users to manage their API keys
2. Implement team management features
3. Add usage analytics for users

## Monitoring and Scaling

### Monitoring

- Set up health checks to monitor service availability
- Use Render's built-in monitoring or integrate with services like Datadog or New Relic
- Implement logging with tools like Winston or Pino
- Set up alerts for critical issues

### Scaling

- Set up auto-scaling rules in Render or your cloud provider
- Implement database connection pooling for better performance
- Consider using Redis for caching and session management
- Use a CDN for static assets

## Security Best Practices

- Regularly update dependencies with `npm audit fix`
- Implement proper CORS settings
- Use HTTPS for all communications
- Rotate API keys periodically
- Set up proper authentication and authorization
- Implement rate limiting to prevent abuse
- Conduct regular security audits

## Backup and Disaster Recovery

- Set up regular database backups
- Implement a disaster recovery plan
- Test restoring from backups periodically

## Compliance Considerations

- Implement GDPR compliance if serving European users
- Consider CCPA compliance for California users
- Document your data handling practices
- Create clear Terms of Service and Privacy Policy documents