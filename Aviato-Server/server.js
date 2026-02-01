require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Change this number whenever you release a new APK!
const LATEST_VERSION = "3.0.1";

// These are hidden in the .env file
const VALID_CODE = process.env.ACTIVATION_CODE;
const ADMIN_PHONE = process.env.ADMIN_PHONE || "254750827334"; // Your phone number from .env
const LINKS = {
  telegram: process.env.TELEGRAM_LINK || "https://t.me/your_secure_link",
  whatsapp: process.env.WHATSAPP_LINK || "https://wa.me/your_secure_link",
  whatsappAdmin: `https://wa.me/${ADMIN_PHONE}` // WhatsApp admin link
};

// MANUALLY SET YOUR SIGNALS HERE (as an array)
const SIGNALS = [
  "1.57X",
  "1.98X", 
  "2.72X",
  "1.09X",
  "1.60X",
  "12.45X",
  "3.21X",
  "8.76X",
  "1.33X",
  "45.89X"
];

// Store current signal index for each user/session
let signalIndex = 0;

// Get admin WhatsApp number only
app.get('/api/admin-whatsapp', (req, res) => {
  res.json({
    success: true,
    phone: ADMIN_PHONE,
    formattedPhone: `+${ADMIN_PHONE}`,
    whatsappUrl: `https://wa.me/${ADMIN_PHONE}`
  });
});

// Get all contact links (including WhatsApp admin)
app.get('/api/links', (req, res) => {
  res.json(LINKS);
});

// Version check endpoint
app.get('/api/check-version', (req, res) => {
  res.json({
    latestVersion: LATEST_VERSION,
    downloadUrl: "https://aviatorpredictor-v9.netlify.app/" 
  });
});

// Verify Activation Code
app.post('/api/verify', (req, res) => {
  const { code } = req.body;
  
  // Simulate network delay
  setTimeout(() => {
    if (code === VALID_CODE) {
      res.json({ success: true, message: "ACCESS GRANTED" });
    } else {
      res.status(401).json({ success: false, message: "INVALID KEY" });
    }
  }, 2000);
});

// Get next signal
app.get('/api/next-signal', (req, res) => {
  if (SIGNALS.length === 0) {
    return res.status(404).json({ 
      success: false, 
      message: "No signals available" 
    });
  }
  
  // Get current signal
  const currentSignal = SIGNALS[signalIndex];
  
  // Move to next signal (loop back to start if at end)
  signalIndex = (signalIndex + 1) % SIGNALS.length;
  
  res.json({ 
    success: true, 
    signal: currentSignal,
    index: signalIndex,
    total: SIGNALS.length
  });
});

// Get all signals (for admin panel)
app.get('/api/all-signals', (req, res) => {
  res.json({
    success: true,
    signals: SIGNALS,
    currentIndex: signalIndex,
    total: SIGNALS.length
  });
});

// Reset signal index (optional, for admin)
app.post('/api/reset-signals', (req, res) => {
  signalIndex = 0;
  res.json({ 
    success: true, 
    message: "Signal index reset to 0" 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Loaded ${SIGNALS.length} signals`);
  console.log(`Admin WhatsApp: ${ADMIN_PHONE}`);
  console.log('Signals:', SIGNALS);
});
