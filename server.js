const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const http = require("http");
const https = require("https");

const app = express();
const PORT = 4123;

app.use(cors());

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

app.get("/", async (req, res) => {
  try {
    if (!req.query.url) {
      return res.status(400).send("Missing url parameter");
    }

    const targetUrl = decodeURIComponent(req.query.url);
    const urlObj = new URL(targetUrl);

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Host": "strm.poocloud.in",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
        "Accept": "*/*",
        "Accept-Language": "en-US",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Origin": "https://modistreams.org",
        "Referer": "https://modistreams.org/",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      },
      agent: urlObj.protocol === "https:" ? httpsAgent : httpAgent,
    });

    if (!response.ok) {
      return res.status(502).send("Upstream error");
    }

    // forward content-type
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    // disable caching
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Access-Control-Allow-Origin", "*");

    response.body.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy failed");
  }
});

app.listen(PORT, () => {
  console.log(`✅ HLS Proxy running on http://localhost:${PORT}`);
});
