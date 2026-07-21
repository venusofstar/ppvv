const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors()); // Allow streaming clients

const PORT = process.env.PORT || 3000;
const ORIGIN_MPD = 'http://136.158.97.2:6610/001/2/ch00000090990000001093/manifest.mpd?AuthInfo=v87HD9rEhwHiAdYyrP20TsXah2%2FZLFNNIdWrVrXDMAoLvT86fM74ocVChyFS93HUsyK4TH4mOENKJ45mwOyS0g%3D%3D&version=v1.0&BreakPoint=0&virtualDomain=001.live_hls.zte.com&programid=ch00000000000000001214&contentid=ch00000000000000001214&videoid=ch00000090990000001093&recommendtype=0&userid=1438418816418&boid=001&stbid=02%3A00%3A00%3A00%3A00%3A00&terminalflag=1&profilecode=&usersessionid=BLJMICF8T5XXXX&NeedJITP=1&JITPMediaType=DASH&JITPDRMType=NO&IASHttpSessionId=RR20448620260101155237367179&ispcode=55';

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
    const target = `https://qp-pldt-live-bpk-01-prod.akamaized.net${req.originalUrl}`;
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
