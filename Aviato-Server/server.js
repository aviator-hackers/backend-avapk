const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// These are hidden in the .env file
const VALID_CODE = process.env.ACTIVATION_CODE ;
const LINKS = {
  telegram: process.env.TELEGRAM_LINK || "https://t.me/your_secure_link",
  whatsapp: process.env.WHATSAPP_LINK || "https://wa.me/your_secure_link"
};

// 1. Verify Activation Code
app.post('/api/verify', (req, res) => {
  const { code } = req.body;
  
  // Simulate network delay
  setTimeout(() => {
    if (code === VALID_CODE) {
      res.json({ success: true, message: "ACCESS GRANTED" });
    } else {
      res.status(401).json({ success: false, message: "INVALID KEY" });
    }
  }, 2000); // 2 second delay on server
});

// 2. Get Secure Links
app.get('/api/links', (req, res) => {
  res.json(LINKS);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
