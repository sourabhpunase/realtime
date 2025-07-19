# RealtimeCursor - Real-time Collaboration Platform

A powerful real-time collaboration platform with live cursor tracking, approval workflows, and GitHub-style history.

![RealtimeCursor Demo](https://via.placeholder.com/800x400?text=RealtimeCursor+Demo)

## Features

- **Real-time Collaboration**: See other users' cursors and changes in real-time
- **Approval Workflow**: Stage changes for admin approval
- **GitHub-style History**: Track all changes with proper diff visualization
- **User Management**: Authentication and user roles
- **Comments System**: Add comments to specific text selections
- **React Integration**: Easy-to-use React hooks and components

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/realtimecursor.git
cd realtimecursor
```

### 2. Install dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd realtime
npm install
cd ..
```

### 3. Start the development server

#### Option 1: Using the start script (recommended)

```bash
# Use the provided start script to run both servers
./start-dev.sh
```

#### Option 2: Manual startup

```bash
# Start the backend server
npm start

# In another terminal, start the frontend
cd realtime
npm run dev
```

### 4. Access the application

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### 5. Login as Superadmin

- Email: `superadmin@example.com`
- Password: `SuperAdmin123!`

## Project Structure

```
realtimecursor/
├── api/                  # Backend API
│   ├── server.js         # Express server
│   └── authService.js    # Authentication and project services
├── realtime/             # Frontend React app
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   └── App.jsx       # Main application
│   └── package.json      # Frontend dependencies
├── sdk/                  # SDK for integration
│   ├── src/              # SDK source code
│   └── package.json      # SDK dependencies
├── landing/              # Landing page
├── package.json          # Backend dependencies
└── README.md             # This file
```

## User Roles

- **Superadmin**: Can create projects, invite users, approve changes
- **Admin**: Can manage users, edit projects directly
- **Regular Users**: Can collaborate on invited projects, changes require approval

## SDK Integration

RealtimeCursor can be integrated into your own applications using our SDK:

```bash
npm install realtimecursor-sdk
```

```jsx
import { useRealtimeCursor, useProject } from 'realtimecursor-sdk';

function App() {
  const { client, user, login } = useRealtimeCursor({
    apiUrl: 'https://your-realtimecursor-api.com',
    socketUrl: 'https://your-realtimecursor-api.com'
  });
  
  // Use the SDK to interact with the platform
}
```

To publish the SDK to npm:

```bash
cd sdk
./publish.sh
```

See the [SDK README](./sdk/README.md) for more details.

## Deployment

This project can be deployed to various platforms:

- **Render**: Use the included `render.yaml` configuration
- **Docker**: Use the included `Dockerfile`
- **Manual**: Deploy the backend and frontend separately

Use our deployment script for easy deployment:

```bash
# Show deployment options
./deploy.sh

# Deploy to Render
./deploy.sh render

# Deploy with Docker
./deploy.sh docker

# Get manual deployment instructions
./deploy.sh manual
```

After deployment, update documentation links:

```bash
./update-docs.sh https://your-api-url.com https://your-socket-url.com
```

See the [Deployment Guide](./DEPLOYMENT.md) for detailed instructions.

## Development

### Backend

The backend is built with:

- Node.js + Express
- Socket.io for real-time communication
- JWT for authentication
- In-memory storage (can be replaced with a database)

### Frontend

The frontend is built with:

- React
- Socket.io-client for real-time updates
- Tailwind CSS for styling

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.