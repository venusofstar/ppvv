const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --------------------------
// Configuration
// --------------------------
const AUTH_API = 'https://playback-auth-service.api.plive.quickplay.com/media/content/authorize';
const ORIGIN_BASE = 'https://qp-pldt-live-bpk-01-prod.akamaized.net';
const YOUR_RENDER_DOMAIN = 'https://test.onrender.com';

// Store latest valid token (auto-refreshes)
let cachedToken = null;
let tokenExpiry = 0;

// --------------------------
// 1. Get Fresh Token from API
// --------------------------
async function getFreshToken() {
  // Reuse token if still valid (expires ~2min, refresh 10s early)
  if (cachedToken && Date.now() < tokenExpiry - 10000) {
    return cachedToken;
  }

  try {
    const res = await axios.get(AUTH_API, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.plive.com.ph/'
      },
      timeout: 10000
    });

    // Extract full signed URL or just the token part
    const fullSignedUrl = res.data?.manifestUrl || res.data?.url;
    if (!fullSignedUrl) throw new Error('No signed URL returned from API');

    cachedToken = fullSignedUrl.split('?hdnts=')[1];
    // Parse expiry from token
    const expMatch = cachedToken.match(/exp=(\d+)/);
    tokenExpiry = expMatch ? parseInt(expMatch[1]) * 1000 : Date.now() + 110000;

    console.log('✅ Got fresh token from API');
    return cachedToken;
  } catch (err) {
    console.error('❌ Token fetch failed:', err.message);
    throw err;
  }
}

// --------------------------
// 2. Your Render Proxy Endpoint
// --------------------------
app.get('/bpk-tv/pl_sdi5/default/index.mpd', async (req, res) => {
  try {
    // Use token from request OR auto-fetch fresh one from API
    const token = req.query.hdnts || await getFreshToken();
    const targetUrl = `${ORIGIN_BASE}/bpk-tv/pl_sdi5/default/index.mpd?hdnts=${token}`;

    // Forward request to Akamai
    const streamRes = await axios.get(targetUrl, {
      headers: {
        'Accept': 'application/dash+xml',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.plive.com.ph/'
      },
      responseType: 'text',
      timeout: 15000
    });

    // Serve from your Render domain
    res.setHeader('Content-Type', 'application/dash+xml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(streamRes.data);
  } catch (err) {
    res.status(err.response?.status || 500).send(`
      <h3>Stream Proxy Error</h3>
      <p>Error: ${err.message}</p>
      <p>Get direct signed link: <code>${YOUR_RENDER_DOMAIN}/api/get-signed</code></p>
    `);
  }
});

// --------------------------
// 3. Helper: Get full signed link via Render
// --------------------------
app.get('/api/get-signed', async (req, res) => {
  try {
    const token = await getFreshToken();
    res.json({
      originalSignedUrl: `${ORIGIN_BASE}/bpk-tv/pl_sdi5/default/index.mpd?hdnts=${token}`,
      yourRenderUrl: `${YOUR_RENDER_DOMAIN}/bpk-tv/pl_sdi5/default/index.mpd?hdnts=${token}`,
      note: 'Token valid for ~2 minutes'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --------------------------
// 4. Root Page
// --------------------------
app.get('/', (req, res) => {
  res.send(`
    <h3>✅ Proxy Live on ${YOUR_RENDER_DOMAIN}</h3>
    <p>Use this link in your player (auto-fetches fresh token):</p>
    <code>${YOUR_RENDER_DOMAIN}/bpk-tv/pl_sdi5/default/index.mpd</code>
    <p>Or get full signed link: <a href="${YOUR_RENDER_DOMAIN}/api/get-signed">/api/get-signed</a></p>
  `);
});

app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
