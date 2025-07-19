# Real-time Collaborative Cursor Integration Guide

This guide shows you how to integrate the real-time collaborative cursor system into your React applications.

## 🚀 Quick Start

### Basic Integration

```jsx
import { CursorProvider } from './components/CursorProvider';

function MyApp() {
  const user = {
    id: 'user-123',
    name: 'John Doe',
    // ... other user properties
  };

  return (
    <CursorProvider projectId="my-project" user={user}>
      <div className="min-h-screen">
        {/* Your app content here */}
        <h1>My Collaborative App</h1>
        <p>Move your cursor around to see real-time collaboration!</p>
      </div>
    </CursorProvider>
  );
}
```

### Advanced Configuration

```jsx
import { CursorProvider, useCursorData } from './components/CursorProvider';

function MyAdvancedApp() {
  const user = { id: 'user-123', name: 'John Doe' };
  
  const config = {
    showConnectionStatus: true,
    enableClickEffects: true,
    enableHoverEffects: true,
    throttleMs: 16, // 60 FPS
    className: 'my-custom-cursor-container'
  };

  const handleCursorUpdate = (cursor, socketId) => {
    console.log(`User ${cursor.name} moved to:`, cursor.x, cursor.y);
  };

  const handleUserJoin = (user) => {
    console.log(`${user.name} joined the session`);
  };

  const handleUserLeave = (user) => {
    console.log(`${user.name} left the session`);
  };

  return (
    <CursorProvider
      projectId="advanced-project"
      user={user}
      config={config}
      onCursorUpdate={handleCursorUpdate}
      onUserJoin={handleUserJoin}
      onUserLeave={handleUserLeave}
    >
      <MyAppContent />
    </CursorProvider>
  );
}

function MyAppContent() {
  const { cursors, isConnected, userCount } = useCursorData();
  
  return (
    <div>
      <h1>Collaborative Editor</h1>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Active users: {userCount}</p>
      {/* Your content */}
    </div>
  );
}
```

## 🎨 Styling and Customization

### Custom Cursor Colors

The system automatically assigns unique colors to users. You can customize the color palette by modifying the `CURSOR_COLORS` array in `hooks/useCursors.js`:

```javascript
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  // Add your custom colors here
  '#YOUR_COLOR_1', '#YOUR_COLOR_2'
];
```

### Custom Cursor Styles

Override the default cursor styles by adding CSS:

```css
/* Custom cursor appearance */
.collaborative-cursor svg {
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
}

/* Custom name label styling */
.cursor-name-label {
  font-family: 'Your Custom Font';
  border-radius: 8px;
}

/* Custom click effects */
.cursor-click-effect {
  animation: my-custom-click 0.5s ease-out;
}

@keyframes my-custom-click {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}
```

## 🔧 Integration Examples

### 1. Code Editor Integration

```jsx
import { CursorProvider } from './components/CursorProvider';
import MonacoEditor from '@monaco-editor/react';

function CollaborativeCodeEditor({ user, projectId }) {
  return (
    <CursorProvider projectId={projectId} user={user}>
      <div className="h-screen flex flex-col">
        <div className="flex-1">
          <MonacoEditor
            height="100%"
            defaultLanguage="javascript"
            defaultValue="// Start coding together!"
            theme="vs-dark"
          />
        </div>
      </div>
    </CursorProvider>
  );
}
```

### 2. Canvas/Drawing App Integration

```jsx
import { CursorProvider, useCursorData } from './components/CursorProvider';

function CollaborativeCanvas({ user, projectId }) {
  return (
    <CursorProvider 
      projectId={projectId} 
      user={user}
      config={{ enableClickEffects: true }}
    >
      <CanvasArea />
    </CursorProvider>
  );
}

function CanvasArea() {
  const { cursors } = useCursorData();
  
  return (
    <div className="relative w-full h-screen bg-white">
      <canvas 
        width={800} 
        height={600}
        className="border border-gray-300"
      />
      {/* Canvas tools, etc. */}
    </div>
  );
}
```

### 3. Document Editor Integration

```jsx
import { CursorProvider } from './components/CursorProvider';

function CollaborativeDocument({ user, documentId }) {
  return (
    <CursorProvider 
      projectId={`doc-${documentId}`} 
      user={user}
      config={{ 
        enableHoverEffects: true,
        showConnectionStatus: true 
      }}
    >
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white shadow-lg rounded-lg p-8 min-h-screen">
          <h1 className="text-3xl font-bold mb-6">Collaborative Document</h1>
          <div className="prose max-w-none">
            {/* Your document content */}
            <p>Start writing your collaborative document here...</p>
          </div>
        </div>
      </div>
    </CursorProvider>
  );
}
```

## 🛠️ Backend Setup

The cursor system requires a WebSocket server. The backend is already configured in `api/cursors.js` and `api/server.js`.

### Environment Variables

Create a `.env` file in the `api` directory:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
```

### Starting the Backend

```bash
cd api
npm install
npm start
```

## 📡 WebSocket Events

The system uses these WebSocket events:

### Client → Server
- `join-room`: Join a collaboration room
- `cursor-move`: Send cursor position updates
- `cursor-click`: Send click events
- `cursor-hover`: Send hover state changes

### Server → Client
- `room-users`: List of users in the room
- `user-joined`: New user joined
- `user-left`: User left the room
- `cursor-update`: Cursor position update
- `cursor-click`: Click event from another user
- `cursor-hover`: Hover state change from another user

## 🎯 Performance Optimization

### Throttling
Cursor movements are throttled to 60 FPS (16ms) by default. Adjust in the config:

```jsx
<CursorProvider 
  config={{ throttleMs: 33 }} // 30 FPS
  // ... other props
/>
```

### Memory Management
The system automatically cleans up stale cursors after 30 seconds of inactivity.

### Reduced Motion Support
The system respects `prefers-reduced-motion` CSS media query for accessibility.

## 🔒 Security Considerations

1. **Authentication**: Ensure users are authenticated before joining cursor sessions
2. **Rate Limiting**: The backend includes rate limiting for cursor events
3. **Room Isolation**: Users can only see cursors from their specific project/room
4. **Data Validation**: All cursor data is validated on the server

## 🐛 Troubleshooting

### Common Issues

1. **Cursors not appearing**: Check WebSocket connection and ensure backend is running
2. **Laggy cursor movement**: Reduce throttle time or check network latency
3. **Colors not unique**: Increase the `CURSOR_COLORS` array size
4. **Memory leaks**: Ensure proper cleanup when components unmount

### Debug Mode

Enable debug logging:

```jsx
// In useCursors.js, add console.log statements
socket.on('cursor-update', (data) => {
  console.log('Cursor update:', data);
  // ... rest of the handler
});
```

## 📱 Mobile Support

The cursor system works on mobile devices with touch events automatically converted to cursor positions.

## 🎨 Theming

The system supports dark mode and custom themes through CSS variables:

```css
:root {
  --cursor-bg: #ffffff;
  --cursor-text: #000000;
  --cursor-border: #e5e7eb;
}

[data-theme="dark"] {
  --cursor-bg: #1f2937;
  --cursor-text: #ffffff;
  --cursor-border: #374151;
}
```

## 📚 API Reference

### CursorProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `projectId` | string | required | Unique identifier for the collaboration session |
| `user` | object | required | Current user object with id and name |
| `config` | object | `{}` | Configuration options |
| `onCursorUpdate` | function | undefined | Callback for cursor position changes |
| `onUserJoin` | function | undefined | Callback when user joins |
| `onUserLeave` | function | undefined | Callback when user leaves |

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showConnectionStatus` | boolean | `true` | Show connection indicator |
| `enableClickEffects` | boolean | `true` | Enable click animations |
| `enableHoverEffects` | boolean | `true` | Enable hover effects |
| `throttleMs` | number | `16` | Cursor update throttle in milliseconds |
| `className` | string | `''` | Additional CSS classes |

### useCursorData Hook

Returns an object with:
- `cursors`: Map of active cursors
- `isConnected`: WebSocket connection status
- `userCount`: Number of connected users
- `config`: Current configuration

## 🚀 Deployment

### Frontend Deployment
Build and deploy the React app as usual. Update the WebSocket URL in production.

### Backend Deployment
Deploy the Node.js server with WebSocket support. Popular options:
- Heroku
- Railway
- DigitalOcean
- AWS EC2

Update CORS settings for your production domain.

## 🤝 Contributing

Feel free to contribute improvements:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This cursor system is open source and available under the MIT License.