const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Base URLs
const AUTH_URL = 'https://playback-auth-service.api.plive.quickplay.com/media/content/authorize';
const BASE_MANIFEST = 'https://qp-pldt-live-bpk-01-prod.akamaized.net/bpk-tv/pl_sdi5/default/index.mpd';
const RENDER_DOMAIN = 'https://streamss.render.com';

// --------------------------
// 1. Get Fresh Signed URL (Official Way)
// --------------------------
app.get('/api/get-signed-url', async (req, res) => {
  try {
    // Request auth from PLive's official service
    const authRes = await axios.get(AUTH_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.plive.com.ph/',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 12000
    });

    // Official response includes the signed manifest link
    const freshSignedUrl = authRes.data?.manifestUrl || authRes.data?.url || 'No signed URL returned';
    
    res.json({
      success: true,
      baseManifest: BASE_MANIFEST,
      signedManifest: freshSignedUrl,
      note: 'Signed URL is short-lived — use immediately'
    });
  } catch (err) {
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.message,
      hint: 'Valid PLive session/credentials are required to get signed access'
    });
  }
});

// --------------------------
// 2. Proxy: streamss.render.com → Akamai Manifest
// --------------------------
app.get('/bpk-tv/pl_sdi5/default/index.mpd', async (req, res) => {
  try {
    // Use fresh signed URL if available, or append your valid token
    const targetUrl = req.query.hdnts 
      ? `${BASE_MANIFEST}?hdnts=${req.query.hdnts}`
      : BASE_MANIFEST;

    const manifestRes = await axios.get(targetUrl, {
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
    res.send(manifestRes.data);
  } catch (err) {
    res.status(err.response?.status || 500).send(`
      <h3>Manifest Access Error</h3>
      <p>Reason: ${err.message}</p>
      <p>Note: Unsigned manifest needs valid <code>hdnts</code> token — get a fresh one via <code>/api/get-signed-url</code></p>
    `);
  }
});

// --------------------------
// 3. Status Page
// --------------------------
app.get('/', (req, res) => {
  res.send(`
    <h3>✅ Stream Proxy Ready</h3>
    <ul>
      <li>Original: <code>${BASE_MANIFEST}</code></li>
      <li>Your Render Link: <code>${RENDER_DOMAIN}/bpk-tv/pl_sdi5/default/index.mpd</code></li>
      <li>Get fresh signed URL: <a href="/api/get-signed-url">/api/get-signed-url</a></li>
    </ul>
    <p><strong>⚠️ Reminder:</strong> Signed tokens expire quickly — always fetch new ones from official PLive auth.</p>
  `);
});

app.listen(PORT, () => console.log(`🚀 Running on Render port ${PORT}`));
