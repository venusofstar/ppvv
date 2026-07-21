const express = require('express');
const axios = require('axios');
const { parseStringPromise, Builder } = require('xml2js');

const app = express();
const PORT = 3000;
const SOURCE_MPD = 'http://136.239.173.3:6610/001/2/ch00000090990000001314/manifest.mpd?AuthInfo=v87HD9rEhwHiAdYyrP20TsXah2%2FZLFNNIdWrVrXDMAp7Iya5QVRTA1RELFN4tQIJ2%2FjHNuou2Jtxin49X3LQKw%3D%3D&version=v1.0&BreakPoint=0&virtualDomain=001.live_hls.zte.com&programid=ch00000000000000001814&contentid=ch00000000000000001814&videoid=ch00000090990000001314&recommendtype=0&userid=1662150007478&boid=001&stbid=02%3A00%3A00%3A00%3A00%3A00&terminalflag=1&profilecode=&usersessionid=UAIG9NVEJ1AXXX&NeedJITP=1&JITPMediaType=DASH&JITPDRMType=NO&IASHttpSessionId=RR20446920260101155241033759&ispcode=55';

// Serve/process MPD (keep as MPD format)
app.get('/index.mpd', async (req, res) => {
  try {
    // Fetch original manifest
    const { data: mpdXml } = await axios.get(SOURCE_MPD, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'text'
    });

    // Optional: parse, modify, re-serialize (still MPD)
    const parsed = await parseStringPromise(mpdXml);
    // e.g. adjust base URLs, replace paths, add headers here
    const builder = new Builder({ headless: false });
    const modifiedMpd = builder.buildObject(parsed);

    // Return as valid MPD
    res.setHeader('Content-Type', 'application/dash+xml');
    res.send(modifiedMpd);
  } catch (err) {
    console.error('MPD fetch/process error:', err.message);
    res.status(502).send('Failed to load MPD manifest');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
