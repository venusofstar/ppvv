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
 * CHOOSE SOURCE IP
 * =========================
 * Use ONE of these
 */

// IPv6 (recommended if supported)
const LOCAL_IPV6 = "2001:4860:7:512::3";

// IPv4 fallback
const LOCAL_IPV4 = "156.59.24.51";

/**
 * =========================
 * KEEP-ALIVE AGENTS
 * =========================
 */
const httpAgent = new http.Agent({
  keepAlive: true,
  localAddress: LOCAL_IPV4, // change to LOCAL_IPV6 if IPv6 only
  maxSockets: 200,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  localAddress: LOCAL_IPV6, // IPv6 preferred
  maxSockets: 200,
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
 * http://localhost:3000/proxy?url=https://example.com/stream.m3u8
 */
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const isHttps = targetUrl.startsWith("https://");

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36 Chrome/120",
        "Accept": "*/*",
        "Connection": "keep-alive",
      },
      agent: isHttps ? httpsAgent : httpAgent,
      timeout: 15000,
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
        console.error("Pipeline error:", err.message);
        res.destroy();
      }
    });
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(502).send("Proxy fetch failed");
  }
});

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/", (req, res) => {
  res.send("Proxy server running ✔ IPv4 / IPv6 ready");
});

/**
 * =========================
 * START SERVER
 * =========================
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy listening on port ${PORT}`);
});
