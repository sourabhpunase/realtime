# RealtimeCursor SDK

A powerful SDK for integrating real-time collaboration with cursor tracking and approval workflows into your React applications.

## Features

- **Real-time Collaboration**: See other users' cursors and changes in real-time
- **Approval Workflow**: Stage changes for admin approval
- **GitHub-style History**: Track all changes with proper diff visualization
- **User Management**: Authentication and user roles
- **Comments System**: Add comments to specific text selections
- **React Integration**: Easy-to-use React hooks and components

## Installation

```bash
npm install realtimecursor-sdk
# or
yarn add realtimecursor-sdk
```

## Quick Start

### 1. Initialize the SDK

```jsx
import React from 'react';
import { useRealtimeCursor } from 'realtimecursor-sdk';

function App() {
  const { client, user, login, logout, isAuthenticated, loading } = useRealtimeCursor({
    apiUrl: 'https://your-realtimecursor-api.com',
    socketUrl: 'https://your-realtimecursor-api.com'
  });

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {!isAuthenticated ? (
        <button onClick={handleLogin}>Login</button>
      ) : (
        <div>
          <p>Welcome, {user?.fullName}</p>
          <button onClick={logout}>Logout</button>
          <ProjectsList client={client} />
        </div>
      )}
    </div>
  );
}
```

### 2. Work with Projects

```jsx
import React, { useRef } from 'react';
import { 
  useProject, 
  useCursorTracking, 
  CollaborativeEditor, 
  CursorOverlay,
  CollaboratorsList,
  HistoryList
} from 'realtimecursor-sdk';

function ProjectEditor({ client, projectId }) {
  const editorRef = useRef(null);
  const { 
    project, 
    content, 
    comments, 
    stagedChanges, 
    history, 
    collaborators, 
    cursors, 
    updateContent, 
    addComment,
    reviewChange
  } = useProject(client, projectId);

  // Set up cursor tracking
  useCursorTracking(editorRef, client);

  const handleContentChange = (newContent) => {
    updateContent(newContent);
  };

  return (
    <div className="project-editor">
      <h1>{project?.name}</h1>
      
      {/* Collaborators list */}
      <CollaboratorsList collaborators={collaborators} />
      
      {/* Editor with cursor overlay */}
      <div style={{ position: 'relative' }}>
        <CollaborativeEditor
          content={content}
          onChange={handleContentChange}
          editorRef={editorRef}
          placeholder="Start collaborating..."
        />
        
        <CursorOverlay
          cursors={cursors}
          content={content}
          editorRef={editorRef}
        />
      </div>
      
      {/* History panel */}
      <div className="history-panel">
        <h3>History</h3>
        <HistoryList history={history} />
      </div>
      
      {/* Review changes (for admins) */}
      {stagedChanges.length > 0 && (
        <div className="review-panel">
          <h3>Pending Changes ({stagedChanges.length})</h3>
          <ReviewChangesList
            changes={stagedChanges}
            onApprove={(changeId, feedback) => reviewChange(changeId, true, feedback)}
            onReject={(changeId, feedback) => reviewChange(changeId, false, feedback)}
          />
        </div>
      )}
    </div>
  );
}
```

## API Reference

### Core SDK

- `RealtimeCursorSDK`: Main SDK class
- `createRealtimeCursorClient(config)`: Helper to create SDK instance

### React Hooks

- `useRealtimeCursor(config)`: Main hook for authentication
- `useProject(client, projectId)`: Hook for project operations
- `useCursorTracking(editorRef, client)`: Hook for cursor tracking

### React Components

- `CollaborativeEditor`: Textarea with collaboration features
- `CursorOverlay`: Displays other users' cursors
- `CollaboratorsList`: Shows active collaborators
- `HistoryList`: Displays project history
- `ReviewChangesList`: UI for reviewing changes

## Self-Hosting

This SDK is designed to work with the RealtimeCursor backend service. To self-host:

1. Clone the repository: `git clone https://github.com/yourusername/realtimecursor.git`
2. Install dependencies: `npm install`
3. Start the server: `./start-dev.sh`

For production deployment, use the included Docker or Render configurations.

## License

MIT