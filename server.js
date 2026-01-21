import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= CONFIG ================= */

const SECRET_KEY = "CHANGE_THIS_SECRET_KEY_NOW";

// Stream URLs
const ottStreamURL = "https://hntv.netlify.app/free-playlist";
const altStreamURL = "https://pastebin.com/raw/YctRidwE";

// Allowed OTT User-Agents
const allowedAgents = [
  "OTT Navigator",
  "OTT Player",
  "OTT TV"
];

// Forced headers
const FORCED_REFERER = "https://hntv.netlify.app/free-playlist";

/* ================= TOKEN LOGIC ================= */

// Generate token (use in admin panel / generator)
function generateDeviceToken(deviceId, expiryMinutes = 60) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiryMinutes * 60;
  const raw = `${deviceId}|${expiresAt}`;
  const payload = Buffer.from(raw).toString("base64");

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

// Verify token
function verifyDeviceToken(token, deviceId) {
  if (!token || !deviceId) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;

  const expectedSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSig) return false;

  const decoded = Buffer.from(payload, "base64").toString();
  const [tokenDeviceId, expiresAt] = decoded.split("|");

  if (tokenDeviceId !== deviceId) return false;
  if (Date.now() / 1000 > Number(expiresAt)) return false;

  return true;
}

// Extract deviceId & token from UA
// Expected format:
// OTT TV/... (Linux;Android 13; en; DEVICEID:TOKEN)
function extractDeviceData(userAgent) {
  const match = userAgent.match(/;\s*([^:]+):([A-Za-z0-9+/=.-]+)\)$/);
  if (!match) return null;

  return {
    deviceId: match[1],
    token: match[2]
  };
}

/* ================= ROUTES ================= */

// Main stream endpoint
app.get("/", async (req, res) => {
  const userAgent = req.headers["user-agent"] || "";

  // Extract device info
  const deviceData = extractDeviceData(userAgent);
  if (!deviceData) {
    return res.status(403).send("Invalid User-Agent format");
  }

  const { deviceId, token } = deviceData;

  // Validate token
  if (!verifyDeviceToken(token, deviceId)) {
    return res.status(403).send("Expired or invalid device token");
  }

  // Check OTT app
  const isAllowedOTTApp = allowedAgents.some(agent =>
    userAgent.includes(agent)
  );

  const streamURL = isAllowedOTTApp ? ottStreamURL : altStreamURL;

  try {
    const response = await fetch(streamURL, {
      headers: {
        "User-Agent": userAgent,
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

// Optional: token generator endpoint (REMOVE IN PRODUCTION)
app.get("/generate", (req, res) => {
  const { deviceId, minutes } = req.query;
  if (!deviceId) {
    return res.status(400).send("deviceId required");
  }

  const token = generateDeviceToken(deviceId, Number(minutes) || 60);
  res.json({ deviceId, token });
});

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
