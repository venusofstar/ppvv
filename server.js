const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// --------------------------
// Your Streaming Endpoints
// --------------------------
const AUTH_URL = 'https://playback-auth-service.api.plive.quickplay.com/media/content/authorize';
const MANIFEST_URL = 'https://qp-pldt-live-bpk-01-prod.akamaized.net/bpk-tv/pl_sdi5/default/index.mpd';
const SIGNED_MANIFEST_URL = 'https://qp-pldt-live-bpk-01-prod.akamaized.net/bpk-tv/pl_sdi5/default/index.mpd?hdnts=st=1784642593~exp=1784642713~acl=*~id=_IpXNc_4eqAyjSbrj5Z4P_Q5vPHhkOKAAfAUIkXv2de6EZ8~hmac=7e8fe83faed03c10055642ea5736a2a3fae34e2d2a19cd0510172461cd2e290c';

// --------------------------
// 1. Test Authorization Request
// --------------------------
app.get('/api/auth', async (req, res) => {
  try {
    const response = await axios.get(AUTH_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.plive.com.ph/'
      },
      timeout: 10000
    });
    res.status(200).json({
      success: true,
      data: response.data,
      message: 'Authorization endpoint reached'
    });
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      detail: error.response?.data || 'No response from auth server'
    });
  }
});

// --------------------------
// 2. Fetch Signed DASH Manifest
// --------------------------
app.get('/api/manifest', async (req, res) => {
  try {
    const response = await axios.get(SIGNED_MANIFEST_URL, {
      headers: {
        'Accept': 'application/dash+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      responseType: 'text',
      timeout: 15000
    });
    res.setHeader('Content-Type', 'application/dash+xml');
    res.send(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      note: 'Signed URL may have expired — validity shown as ~2 minutes from issuance'
    });
  }
});

// --------------------------
// 3. Root Status Check
// --------------------------
app.get('/', (req, res) => {
  res.send(`
    <h3>Pilipinas Live Stream Server</h3>
    <p>Available routes:</p>
    <ul>
      <li>GET /api/auth - Test authorization endpoint</li>
      <li>GET /api/manifest - Fetch signed DASH manifest</li>
    </ul>
    <p><strong>Note:</strong> The provided signed URL expires quickly — request a new one from official PLive services for continued access.</p>
  `);
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Auth endpoint: ${AUTH_URL}`);
  console.log(`📺 Manifest endpoint: ${MANIFEST_URL}`);
  console.log(`⚠️  Signed URL validity: Expires after short window per Akamai token rules`);
});
