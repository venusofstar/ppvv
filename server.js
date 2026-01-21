import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Stream URLs
const ottStreamURL = "https://hntv.netlify.app/free-playlist";
const altStreamURL = "https://pastebin.com/raw/YctRidwE";

// Allowed OTT User-Agents
const allowedAgents = [
  "OTT Navigator",
  "OTT Player",
  "OTT TV"
];

// 🔒 Forced Referer (same as OTT URL)
const FORCED_REFERER = "https://hntv.netlify.app/free-playlist";

app.get("/", async (req, res) => {
  const userAgent = req.headers["user-agent"] || "";

  const isAllowedOTTApp = allowedAgents.some(agent =>
    userAgent.includes(agent)
  );

  const streamURL = isAllowedOTTApp ? ottStreamURL : altStreamURL;

  try {
    const response = await fetch(streamURL, {
      headers: {
        "User-Agent": userAgent || "OTT Navigator",
        "Referer": FORCED_REFERER,
        "Origin": FORCED_REFERER,
        "Cache-Control": "no-cache"
      }
    });

    if (!response.ok) {
      return res.status(response.status).send("Stream fetch error");
    }

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");

    response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
