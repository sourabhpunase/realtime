const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage for real-time collaboration
const documents = new Map();
const inputs = new Map();
const userSessions = new Map();
const documentUsers = new Map();
const inputUsers = new Map();

// Input structure
class CollaborativeInput {
  constructor(id) {
    this.id = id;
    this.content = '';
    this.cursors = new Map();
    this.selections = new Map();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  setContent(content) {
    this.content = content;
    this.updatedAt = new Date();
  }

  setCursor(userId, cursor) {
    this.cursors.set(userId, {
      ...cursor,
      timestamp: Date.now()
    });
  }

  setSelection(userId, selection) {
    this.selections.set(userId, {
      ...selection,
      timestamp: Date.now()
    });
  }

  removeCursor(userId) {
    this.cursors.delete(userId);
    this.selections.delete(userId);
  }

  getState() {
    return {
      id: this.id,
      content: this.content,
      cursors: Array.from(this.cursors.entries()).map(([userId, cursor]) => ({
        userId,
        ...cursor
      })),
      selections: Array.from(this.selections.entries()).map(([userId, selection]) => ({
        userId,
        ...selection
      })),
      updatedAt: this.updatedAt
    };
  }
}

// Document structure
class Document {
  constructor(id, title = 'Untitled Document') {
    this.id = id;
    this.title = title;
    this.content = '';
    this.operations = [];
    this.version = 0;
    this.cursors = new Map();
    this.selections = new Map();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  applyOperation(operation) {
    this.operations.push(operation);
    this.version++;
    this.updatedAt = new Date();
    
    // Apply text operation
    if (operation.type === 'insert') {
      this.content = this.content.slice(0, operation.position) + 
                    operation.text + 
                    this.content.slice(operation.position);
    } else if (operation.type === 'delete') {
      this.content = this.content.slice(0, operation.position) + 
                    this.content.slice(operation.position + operation.length);
    } else if (operation.type === 'replace') {
      this.content = this.content.slice(0, operation.position) + 
                    operation.text + 
                    this.content.slice(operation.position + operation.length);
    }
  }

  setCursor(userId, cursor) {
    this.cursors.set(userId, {
      ...cursor,
      timestamp: Date.now()
    });
  }

  setSelection(userId, selection) {
    this.selections.set(userId, {
      ...selection,
      timestamp: Date.now()
    });
  }

  removeCursor(userId) {
    this.cursors.delete(userId);
    this.selections.delete(userId);
  }

  getState() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      version: this.version,
      cursors: Array.from(this.cursors.entries()).map(([userId, cursor]) => ({
        userId,
        ...cursor
      })),
      selections: Array.from(this.selections.entries()).map(([userId, selection]) => ({
        userId,
        ...selection
      })),
      updatedAt: this.updatedAt
    };
  }
}

// User colors for cursors
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

let colorIndex = 0;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join document room
  socket.on('join-document', (data) => {
    const { documentId, user } = data;
    
    // Create document if it doesn't exist
    if (!documents.has(documentId)) {
      documents.set(documentId, new Document(documentId));
    }

    const document = documents.get(documentId);
    
    // Assign user color
    const userColor = userColors[colorIndex % userColors.length];
    colorIndex++;

    // Store user session
    const userSession = {
      id: user.id,
      name: user.name || user.fullName || 'Anonymous',
      email: user.email,
      color: userColor,
      socketId: socket.id,
      documentId: documentId,
      joinedAt: new Date(),
      isActive: true
    };

    userSessions.set(socket.id, userSession);

    // Add user to document users
    if (!documentUsers.has(documentId)) {
      documentUsers.set(documentId, new Map());
    }
    documentUsers.get(documentId).set(socket.id, userSession);

    // Join socket room
    socket.join(documentId);

    // Send current document state to the new user
    socket.emit('document-state', document.getState());

    // Send current users list
    const currentUsers = Array.from(documentUsers.get(documentId).values());
    socket.emit('users-update', currentUsers);

    // Notify other users about new user
    socket.to(documentId).emit('user-joined', userSession);
    socket.to(documentId).emit('users-update', currentUsers);

    console.log(`User ${userSession.name} joined document ${documentId}`);
  });

  // Handle text operations
  socket.on('operation', (data) => {
    const userSession = userSessions.get(socket.id);
    if (!userSession) return;

    const { documentId } = userSession;
    const document = documents.get(documentId);
    if (!document) return;

    const operation = {
      ...data,
      id: uuidv4(),
      userId: userSession.id,
      userName: userSession.name,
      timestamp: Date.now(),
      version: document.version + 1
    };

    // Apply operation to document
    document.applyOperation(operation);

    // Broadcast operation to all users in the document
    socket.to(documentId).emit('operation', operation);

    // Send acknowledgment to sender
    socket.emit('operation-ack', {
      operationId: operation.id,
      version: document.version
    });

    console.log(`Operation applied: ${operation.type} by ${userSession.name}`);
  });

  // Handle cursor position updates
  socket.on('cursor-update', (data) => {
    const userSession = userSessions.get(socket.id);
    if (!userSession) return;

    const { documentId } = userSession;
    const document = documents.get(documentId);
    if (!document) return;

    const cursor = {
      position: data.position,
      line: data.line,
      column: data.column,
      color: userSession.color,
      userName: userSession.name
    };

    document.setCursor(userSession.id, cursor);

    // Broadcast cursor update to other users
    socket.to(documentId).emit('cursor-update', {
      userId: userSession.id,
      ...cursor
    });
  });

  // Handle text selection updates
  socket.on('selection-update', (data) => {
    const userSession = userSessions.get(socket.id);
    if (!userSession) return;

    const { documentId } = userSession;
    const document = documents.get(documentId);
    if (!document) return;

    const selection = {
      start: data.start,
      end: data.end,
      color: userSession.color,
      userName: userSession.name
    };

    document.setSelection(userSession.id, selection);

    // Broadcast selection update to other users
    socket.to(documentId).emit('selection-update', {
      userId: userSession.id,
      ...selection
    });
  });

  // Handle user activity (typing indicator)
  socket.on('typing', (data) => {
    const userSession = userSessions.get(socket.id);
    if (!userSession) return;

    socket.to(userSession.documentId).emit('user-typing', {
      userId: userSession.id,
      userName: userSession.name,
      isTyping: data.isTyping
    });
  });

  // Handle input collaboration
  socket.on('join-input', (data) => {
    const { inputId, user } = data;
    
    // Create input if it doesn't exist
    if (!inputs.has(inputId)) {
      inputs.set(inputId, new CollaborativeInput(inputId));
    }

    const input = inputs.get(inputId);
    
    // Assign user color
    const userColor = userColors[colorIndex % userColors.length];
    colorIndex++;

    // Store user session for input
    const inputUserSession = {
      id: user.id,
      name: user.name || user.fullName || 'Anonymous',
      email: user.email,
      color: userColor,
      socketId: socket.id,
      inputId: inputId,
      joinedAt: new Date(),
      isActive: true
    };

    // Add user to input users
    if (!inputUsers.has(inputId)) {
      inputUsers.set(inputId, new Map());
    }
    inputUsers.get(inputId).set(socket.id, inputUserSession);

    // Join socket room
    socket.join(`input-${inputId}`);

    // Send current input state to the new user
    socket.emit('input-state', input.getState());

    // Send current users list
    const currentInputUsers = Array.from(inputUsers.get(inputId).values());
    socket.emit('input-users-update', currentInputUsers);

    // Notify other users about new user
    socket.to(`input-${inputId}`).emit('input-users-update', currentInputUsers);

    console.log(`User ${inputUserSession.name} joined input ${inputId}`);
  });

  // Handle input content changes
  socket.on('input-content-change', (data) => {
    const { inputId, content, cursorPosition } = data;
    const input = inputs.get(inputId);
    if (!input) return;

    const inputUserSession = Array.from(inputUsers.get(inputId)?.values() || [])
      .find(u => u.socketId === socket.id);
    if (!inputUserSession) return;

    input.setContent(content);

    // Broadcast content update to all users in the input
    socket.to(`input-${inputId}`).emit('input-content-update', {
      inputId,
      content,
      cursorPosition,
      userId: inputUserSession.id,
      userName: inputUserSession.name
    });
  });

  // Handle input cursor position updates
  socket.on('input-cursor-update', (data) => {
    const { inputId, position, line, column } = data;
    const input = inputs.get(inputId);
    if (!input) return;

    const inputUserSession = Array.from(inputUsers.get(inputId)?.values() || [])
      .find(u => u.socketId === socket.id);
    if (!inputUserSession) return;

    const cursor = {
      position,
      line,
      column,
      color: inputUserSession.color,
      userName: inputUserSession.name
    };

    input.setCursor(inputUserSession.id, cursor);

    // Broadcast cursor update to other users
    socket.to(`input-${inputId}`).emit('input-cursor-update', {
      userId: inputUserSession.id,
      ...cursor
    });
  });

  // Handle input text selection updates
  socket.on('input-selection-update', (data) => {
    const { inputId, start, end } = data;
    const input = inputs.get(inputId);
    if (!input) return;

    const inputUserSession = Array.from(inputUsers.get(inputId)?.values() || [])
      .find(u => u.socketId === socket.id);
    if (!inputUserSession) return;

    const selection = {
      start,
      end,
      color: inputUserSession.color,
      userName: inputUserSession.name
    };

    input.setSelection(inputUserSession.id, selection);

    // Broadcast selection update to other users
    socket.to(`input-${inputId}`).emit('input-selection-update', {
      userId: inputUserSession.id,
      ...selection
    });
  });

  // Handle input user activity (typing indicator)
  socket.on('input-typing', (data) => {
    const { inputId, isTyping } = data;
    const inputUserSession = Array.from(inputUsers.get(inputId)?.values() || [])
      .find(u => u.socketId === socket.id);
    if (!inputUserSession) return;

    socket.to(`input-${inputId}`).emit('input-user-typing', {
      userId: inputUserSession.id,
      userName: inputUserSession.name,
      isTyping
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const userSession = userSessions.get(socket.id);
    if (userSession) {
      const { documentId } = userSession;
      const document = documents.get(documentId);
      
      if (document) {
        // Remove user's cursor and selection
        document.removeCursor(userSession.id);
      }

      // Remove user from document users
      if (documentUsers.has(documentId)) {
        documentUsers.get(documentId).delete(socket.id);
        
        // Notify other users about user leaving
        socket.to(documentId).emit('user-left', userSession);
        
        // Send updated users list
        const remainingUsers = Array.from(documentUsers.get(documentId).values());
        socket.to(documentId).emit('users-update', remainingUsers);
      }

      // Remove user session
      userSessions.delete(socket.id);

      console.log(`User ${userSession.name} disconnected from document ${documentId}`);
    }

    // Handle input disconnections
    for (const [inputId, users] of inputUsers.entries()) {
      if (users.has(socket.id)) {
        const inputUserSession = users.get(socket.id);
        const input = inputs.get(inputId);
        
        if (input) {
          // Remove user's cursor and selection
          input.removeCursor(inputUserSession.id);
        }

        // Remove user from input users
        users.delete(socket.id);
        
        // Send updated users list
        const remainingUsers = Array.from(users.values());
        socket.to(`input-${inputId}`).emit('input-users-update', remainingUsers);

        console.log(`User ${inputUserSession.name} disconnected from input ${inputId}`);
        break;
      }
    }

    console.log('User disconnected:', socket.id);
  });
});

// REST API endpoints
app.get('/api/documents', (req, res) => {
  const documentList = Array.from(documents.values()).map(doc => ({
    id: doc.id,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    version: doc.version
  }));
  
  res.json({ documents: documentList });
});

app.post('/api/documents', (req, res) => {
  const { title } = req.body;
  const documentId = uuidv4();
  const document = new Document(documentId, title || 'Untitled Document');
  
  documents.set(documentId, document);
  
  res.json({
    id: document.id,
    title: document.title,
    createdAt: document.createdAt
  });
});

app.get('/api/documents/:id', (req, res) => {
  const document = documents.get(req.params.id);
  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  res.json(document.getState());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeDocuments: documents.size,
    activeSessions: userSessions.size
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Real-time collaboration server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🌐 HTTP API: http://localhost:${PORT}`);
  console.log(`✅ Ready for real-time collaboration!`);
});

module.exports = { app, server, io };