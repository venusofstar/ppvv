const express = require("express");
const fetch = require("node-fetch");
const { pipeline } = require("stream");
const http = require("http");
const https = require("https");
const cors = require("cors");

const app = express();
const PORT = 4123;

app.use(cors());

app.get("/", async (req, res) => {
  const target = req.query.url;
  if (!target) {
    return res.status(400).send("Missing ?url=");
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(target, {
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Referer": req.headers["referer"] || "",
        "Origin": req.headers["origin"] || ""
      },
      redirect: "follow",
      signal: controller.signal
    });

    clearTimeout(timeout);

    res.status(response.status);
    response.headers.forEach((v, k) => res.setHeader(k, v));

    pipeline(response.body, res, err => {
      if (err) console.error(err);
    });

  } catch (err) {
    res.status(502).send("Proxy error");
  }
});

http.createServer(app).listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
