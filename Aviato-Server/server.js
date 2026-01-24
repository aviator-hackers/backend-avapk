const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');
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

// Serve uploaded images statically
app.use('/uploads', express.static('uploads'));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
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

// 3. Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Return the full URL to the uploaded image
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // When a user joins
  socket.on('join', ({ sessionId, displayName }) => {
    socket.join(sessionId);
    activeSessions.set(socket.id, { sessionId, displayName, role: 'user' });
    console.log(`${displayName} joined session ${sessionId}`);
    
    // Notify admin about new user
    socket.to('admin-room').emit('user-joined', { sessionId, displayName });
  });

  // When admin joins
  socket.on('join-admin', () => {
    socket.join('admin-room');
    activeSessions.set(socket.id, { role: 'admin' });
    console.log('Admin joined');
  });

  // Handle messages (text or images)
  socket.on('send-message', (data) => {
    const { sessionId, displayName, text, imageUrl, senderRole } = data;
    
    const message = {
      session_id: sessionId,
      display_name: displayName,
      text: text || '',
      image_url: imageUrl || null,
      sender_role: senderRole,
      created_at: new Date().toISOString()
    };

    // Send to user's session
    io.to(sessionId).emit('message', message);
    
    // Send to admin room
    io.to('admin-room').emit('message', message);
    
    console.log(`Message from ${displayName}: ${text || '[Image]'}`);
  });

  socket.on('disconnect', () => {
    const session = activeSessions.get(socket.id);
    if (session) {
      console.log(`${session.displayName || 'Client'} disconnected`);
      activeSessions.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
