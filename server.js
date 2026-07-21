const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Your original Akamai base URL
const ORIGIN_BASE = 'https://qp-pldt-live-bpk-01-prod.akamaized.net';

// Proxy ALL requests to match your path
app.get('/bpk-tv/pl_sdi5/default/index.mpd', async (req, res) => {
  try {
    // Forward full request including any ?hdnts=... parameters
    const targetUrl = `${ORIGIN_BASE}${req.originalUrl}`;

    const response = await axios.get(targetUrl, {
      headers: {
        'Accept': 'application/dash+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.plive.com.ph/'
      },
      responseType: 'text',
      timeout: 15000
    });

    res.setHeader('Content-Type', 'application/dash+xml');
    res.send(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).send(`
      <h3>Proxy Error</h3>
      <p>Original URL: ${ORIGIN_BASE}${req.originalUrl}</p>
      <p>Message: ${err.message}</p>
      <p><strong>Note:</strong> Your hdnts token is expired — get a fresh valid token from PLive.</p>
    `);
  }
});

// Root page for your Render domain
app.get('/', (req, res) => {
  res.send(`
    <h3>✅ Proxy Active</h3>
    <p>Use this format with a <strong>fresh valid hdnts token</strong>:</p>
    <code>https://test.onrender.com/bpk-tv/pl_sdi5/default/index.mpd?hdnts=PASTE_YOUR_NEW_TOKEN_HERE</code>
  `);
});

app.listen(PORT, () => console.log(`✅ Running on port ${PORT}`));
