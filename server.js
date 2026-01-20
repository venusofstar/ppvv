const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const http = require("http");
const https = require("https");
const { pipeline } = require("stream");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * =========================
 * KEEP-ALIVE AGENTS
 * (IPv4 ONLY – Render safe)
 * =========================
 */
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 300,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 300,
});

/**
 * =========================
 * MIDDLEWARE
 * =========================
 */
app.use(cors());
app.use(express.raw({ type: "*/*" }));

/**
 * =========================
 * PROXY ROUTE
 * =========================
 * Example:
 * /proxy?url=https%3A%2F%2Fexample.com%2Fstream.m3u8
 */
app.get("/proxy", async (req, res) => {
  if (!req.query.url) {
    return res.status(400).send("Missing url parameter");
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(req.query.url);
  } catch {
    return res.status(400).send("Invalid URL encoding");
  }

  const isHttps = targetUrl.startsWith("https://");

  try {
    const response = await fetch(targetUrl, {
      agent: isHttps ? httpsAgent : httpAgent,
      timeout: 15000,
      headers: {
        "User-Agent": "http-user-agent=Mozilla/5.0 (X11; Linux x86_64; rv:139.0) Gecko/20100101 Firefox/139.0",
        "Accept": "*/*",
        "Referer": "https://modistreams.org/",
        "Origin": "https://modistreams.org",
        "Connection": "keep-alive",
      },
    });

    res.status(response.status);

    response.headers.forEach((value, key) => {
      if (
        ![
          "content-encoding",
          "transfer-encoding",
          "connection",
        ].includes(key.toLowerCase())
      ) {
        res.setHeader(key, value);
      }
    });

    pipeline(response.body, res, (err) => {
      if (err) {
        console.error("Stream pipeline error:", err.message);
        res.destroy();
      }
    });
  } catch (err) {
    console.error("Proxy fetch error:", err.message);
    res.status(502).send("Proxy request failed");
  }
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.send("✅ IPTV Proxy running (Render optimized)");
});

/**
 * =========================
 * START SERVER
 * =========================
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Proxy running on port ${PORT}`);
});
