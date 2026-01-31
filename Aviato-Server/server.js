// server.js - Updated with WhatsApp contact endpoints

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Change this number whenever you release a new APK!
const LATEST_VERSION = "2.0.1";

// These are hidden in the .env file
const VALID_CODE = process.env.ACTIVATION_CODE;
const ADMIN_PHONE = process.env.ADMIN_PHONE || "254796182560"; // Your phone number
const LINKS = {
  telegram: process.env.TELEGRAM_LINK || "https://t.me/your_secure_link",
  whatsapp: process.env.WHATSAPP_LINK || "https://wa.me/your_secure_link"
};

// MANUALLY SET YOUR SIGNALS HERE (as an array)
const SIGNALS = [
  "2.91X",
  "1.94X", 
  "27.01X",
  "1.01X",
  "5.67X",
  "12.45X",
  "3.21X",
  "8.76X",
  "1.33X",
  "45.89X"
];

// Store current signal index for each user/session
let signalIndex = 0;

// WhatsApp contact function
const generateWhatsAppUrl = (phoneNumber, message = "") => {
  // Clean phone number (remove +, spaces, etc.)
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // App deep link (opens WhatsApp app if installed)
  const appUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  
  // Web fallback (opens in browser)
  const webUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  
  return { appUrl, webUrl };
};

// Get WhatsApp contact info
app.get('/api/whatsapp-contact', (req, res) => {
  const { message } = req.query;
  
  const defaultMessage = "Hello, I need assistance with Aviator Predictor.";
  const finalMessage = message || defaultMessage;
  
  const { appUrl, webUrl } = generateWhatsAppUrl(ADMIN_PHONE, finalMessage);
  
  res.json({
    success: true,
    phone: ADMIN_PHONE,
    appUrl: appUrl,
    webUrl: webUrl,
    message: finalMessage
  });
});

// Send message via WhatsApp (POST endpoint if you want to customize messages)
app.post('/api/send-whatsapp', (req, res) => {
  const { phone, message, userId, platform } = req.body;
  
  // Use provided phone or default admin phone
  const targetPhone = phone || ADMIN_PHONE;
  
  let finalMessage = message || "Hello, I need assistance with Aviator Predictor.";
  
  // Add context if available
  if (userId) {
    finalMessage += `\n\nUser ID: ${userId}`;
  }
  if (platform) {
    finalMessage += `\nPlatform: ${platform}`;
  }
  
  const { appUrl, webUrl } = generateWhatsAppUrl(targetPhone, finalMessage);
  
  res.json({
    success: true,
    phone: targetPhone,
    appUrl: appUrl,
    webUrl: webUrl,
    formattedMessage: finalMessage
  });
});

// Get admin contact info (all contact methods)
app.get('/api/admin-contact', (req, res) => {
  const defaultMessage = "Hello, I need assistance with Aviator Predictor.";
  const { appUrl, webUrl } = generateWhatsAppUrl(ADMIN_PHONE, defaultMessage);
  
  res.json({
    success: true,
    contact: {
      whatsapp: {
        phone: ADMIN_PHONE,
        appUrl: appUrl,
        webUrl: webUrl,
        defaultMessage: defaultMessage
      },
      telegram: LINKS.telegram,
      whatsappGroup: LINKS.whatsapp
    }
  });
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

// Get Secure Links
app.get('/api/links', (req, res) => {
  res.json(LINKS);
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
