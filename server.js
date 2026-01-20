const express = require("express");
const fetch = require("node-fetch");
const { pipeline } = require("stream");
const http = require("http");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());

// ==============================
// CHANNEL MAP (EDIT THIS)
// ==============================
const CHANNELS = {
  "gsw.m3u8": "https://strm.poocloud.in/secure/gJMGTgSpbUvJeFXUnRVWIIhcCeRvFtWW/1768870800/1768895280/goldenstatewarriors/bible-verses.best/tracks-v1a1/mono.ts.m3u8",
  "lakers.m3u8": "https://strm.example.com/live/lakers/index.m3u8",
  "nba1.m3u8": "https://strm.example.com/live/nba1/index.m3u8"
};

// ==============================
// MAIN PROXY
// ==============================
app.get("/:file", async (req, res) => {
  const target = CHANNELS[req.params.file];
  if (!target) return res.status(404).send("Channel not found");

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://modistreams.org/",
        "Origin": "https://modistreams.org"
      },
      redirect: "follow"
    });

    res.status(response.status);
    response.headers.forEach((v, k) => res.setHeader(k, v));

    pipeline(response.body, res, err => {
      if (err) console.error(err);
    });

  } catch (e) {
    res.status(502).send("Proxy error");
  }
});

http.createServer(app).listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
