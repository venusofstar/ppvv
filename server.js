const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow streaming clients

const PORT = process.env.PORT || 3000;
const ORIGIN_MPD = 'https://cdnbal1.indihometv.com/atm/DASH/hbo/manifest.mpd';

// Match your exact path
app.get('/bpk-tv/pl_sdi5/default/index.mpd', async (req, res) => {
  try {
    const { data, headers } = await axios.get(ORIGIN_MPD, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      responseType: 'text',
      timeout: 15000
    });

    // Correct MIME type for DASH
    res.setHeader('Content-Type', 'application/dash+xml');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.send(data);
  } catch (err) {
    console.error('Proxy error:', err.response?.status || err.message);
    res.status(err.response?.status || 502).send('Failed to fetch MPD manifest');
  }
});

// Optional: Proxy segment requests too if needed
app.use('/bpk-tv', async (req, res) => {
  try {
    const target = `https://cdnbal1.indihometv.com{req.originalUrl}`;
    const { data } = await axios.get(target, {
      responseType: 'stream',
      timeout: 30000
    });
    data.pipe(res);
  } catch {
    res.status(404).end();
  }
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
  console.log(`Serving MPD at: /bpk-tv/pl_sdi5/default/index.mpd`);
});
