const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const ORIGIN_BASE = 'https://qp-pldt-live-bpk-01-prod.akamaized.net';
const PLIVE_URL = 'https://playback-auth-service.api.plive.quickplay.com/media/content/authorize';

// --- Get fresh hdnts token from PLive ---
async function getFreshToken() {
  try {
    // Step 1: Get PLive session cookies
    const sessionRes = await axios.get(PLIVE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
      },
      timeout: 10000
    });

    const cookies = sessionRes.headers['set-cookie']?.join('; ') || '';

    // Step 2: Call PLive's internal auth endpoint (adjust if needed)
    // You may need to inspect plive.com.ph network tab for exact endpoint
    const authRes = await axios.get('https://playback-auth-service.api.plive.quickplay.com/media/content/authorize', {
      headers: {
        'Referer': PLIVE_URL,
        'Cookie': cookies,
        'User-Agent': sessionRes.config.headers['User-Agent']
      },
      timeout: 10000
    });

    return authRes.data?.hdnts || authRes.data?.token || null;
  } catch (e) {
    console.error('Token fetch failed:', e.message);
    return null;
  }
}

// --- Proxy endpoint with auto-token ---
app.get('/bpk-tv/pl_sdi5/default/index.mpd', async (req, res) => {
  try {
    let hdnts = req.query.hdnts;

    // Auto-fetch if no token provided
    if (!hdnts) {
      hdnts = await getFreshToken();
      if (!hdnts) return res.status(401).send('No valid token — provide hdnts or log into PLive first');
    }

    const targetUrl = `${ORIGIN_BASE}${req.path}?hdnts=${encodeURIComponent(hdnts)}`;

    const streamRes = await axios.get(targetUrl, {
      headers: {
        'Accept': 'application/dash+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Referer': PLIVE_URL
      },
      responseType: 'text',
      timeout: 15000
    });

    res.setHeader('Content-Type', 'application/dash+xml');
    res.send(streamRes.data);
  } catch (err) {
    res.status(err.response?.status || 500).send(`
      <h3>Proxy Error</h3>
      <p>Message: ${err.message}</p>
      <p><strong>Fix:</strong> Log into <a href="${PLIVE_URL}">plive.com.ph</a> to get a fresh token</p>
    `);
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h3>✅ Proxy Ready</h3>
    <p>Use: <code>/${'bpk-tv/pl_sdi5/default/index.mpd'}?hdnts=YOUR_TOKEN</code></p>
    <p>Or it will auto-fetch if you have valid PLive credentials</p>
  `);
});

app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
