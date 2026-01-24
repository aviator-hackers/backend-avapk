const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('✅ Created uploads directory');
}

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    console.log('📎 Receiving file:', file.originalname, file.mimetype);
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpg, png, gif, webp)'));
    }
  }
});

const VALID_CODE = process.env.ACTIVATION_CODE;
const LINKS = {
  telegram: process.env.TELEGRAM_LINK || "https://t.me/legit_predictor1",
  whatsapp: process.env.WHATSAPP_LINK || "https://chat.whatsapp.com/ICuHNh1Oi6PBeCq5KhiNMu"
};

// Store active sessions
const activeSessions = new Map();

// 1. Verify Activation Code
app.post('/api/verify', (req, res) => {
  const { code } = req.body;
  
  setTimeout(() => {
    if (code === VALID_CODE) {
      res.json({ success: true, message: "ACCESS GRANTED" });
    } else {
      res.status(401).json({ success: false, message: "INVALID KEY" });
    }
  }, 2000);
});

// 2. Get Secure Links
app.get('/api/links', (req, res) => {
  res.json(LINKS);
});

// 3. Image Upload Endpoint with detailed logging
app.post('/api/upload', (req, res) => {
  console.log('📤 Upload request received');
  console.log('Headers:', req.headers);
  
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    try {
      console.log('✅ File uploaded:', req.file.filename);
      
      // Construct the full URL
      const protocol = req.protocol;
      const host = req.get('host');
      const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      
      console.log('🖼️ Image URL:', imageUrl);
      
      res.json({ 
        success: true,
        imageUrl,
        filename: req.file.filename 
      });
    } catch (error) {
      console.error('❌ Error processing upload:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  });
});

// Test endpoint to check if server is working
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uploadsDir: uploadsDir,
    uploadsDirExists: fs.existsSync(uploadsDir)
  });
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // When a user joins
  socket.on('join', ({ sessionId, displayName }) => {
    socket.join(sessionId);
    activeSessions.set(socket.id, { sessionId, displayName, role: 'user' });
    console.log(`👤 ${displayName} joined session ${sessionId}`);
    
    // Notify admin about new user
    socket.to('admin-room').emit('user-joined', { sessionId, displayName });
  });

  // When admin joins
  socket.on('admin-join', () => {
    socket.join('admin-room');
    activeSessions.set(socket.id, { role: 'admin' });
    console.log('👨‍💼 Admin joined');
  });

  // Admin typing indicator
  socket.on('admin-typing', ({ targetSessionId, isTyping }) => {
    io.to(targetSessionId).emit('admin-typing', { isTyping });
  });

  // Admin selects a session
  socket.on('admin-select-session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Admin viewing session: ${sessionId}`);
  });

  // Admin read messages (mark as seen)
  socket.on('admin-read-messages', ({ sessionId }) => {
    console.log(`Admin read messages in ${sessionId}`);
  });

  // Handle messages (text or images)
  socket.on('send-message', (data) => {
    const { sessionId, displayName, text, imageData, imageUrl, senderRole } = data;
    
    const message = {
      session_id: sessionId,
      display_name: displayName,
      text: text || '',
      image_url: imageUrl || null,
      imageData: imageData || null, // Base64 image data
      sender_role: senderRole,
      created_at: new Date().toISOString()
    };

    console.log(`💬 Message from ${displayName}:`, text || imageData ? '[Image]' : imageUrl ? '[Image URL]' : '');
    
    // Send to user's session
    io.to(sessionId).emit('message', message);
    
    // Send to admin room
    io.to('admin-room').emit('message', message);
  });

  socket.on('disconnect', () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      console.log(`👋 ${session.displayName || 'Client'} disconnected`);
      activeSessions.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});
