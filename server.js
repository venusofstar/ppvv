const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const https = require("https");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// =========================
// KEEP-ALIVE AGENT
// =========================
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 200,
  keepAliveMsecs: 30000
});

// =========================
// CONFIGURATION
// =========================
const AUTH_TOKEN_URL = "https://auth-platform.api.plive.quickplay.com/oauth2/token";
// Token template provided
const TOKEN_TEMPLATE = "hdnts=st=1784642593~exp=1784642713~acl=*~id=_IpXNc_4eqAyjSbrj5Z4P_Q5vPHhkOKAAfAUIkXv2de6EZ8~hmac=7e8fe83faed03c10055642ea5736a2a3fae34e2d2a19cd0510172461cd2e290c";

// Cached token management
let cachedToken = null;
let tokenExpiry = 0;

// =========================
// TOKEN GENERATION FUNCTION
// =========================
async function getValidAuthToken() {
  const now = Math.floor(Date.now() / 1000);
  
  // Return cached token if still valid (add 30s buffer)
  if (cachedToken && now < tokenExpiry - 30) {
    return cachedToken;
  }

  try {
    // Request new token from auth endpoint
    const response = await fetch(AUTH_TOKEN_URL, {
      method: "POST",
      agent: httpsAgent,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0"
      }
      // Add required auth parameters here if you have client_id/secret/grant_type
      // body: new URLSearchParams({
      //   grant_type: "client_credentials",
      //   client_id: "YOUR_CLIENT_ID",
      //   client_secret: "YOUR_CLIENT_SECRET"
      // })
    });

    if (!response.ok) {
      console.warn(`Auth endpoint returned ${response.status}, using fallback token`);
      // Fallback to provided template if auth endpoint fails
      cachedToken = TOKEN_TEMPLATE;
      tokenExpiry = now + 120; // Assume 2min validity for fallback
      return cachedToken;
    }

    const data = await response.json();
    // Adjust based on actual response format from your auth API
    const newToken = data.access_token || data.token || TOKEN_TEMPLATE;
    const expiresIn = data.expires_in || 120;

    cachedToken = newToken;
    tokenExpiry = now + expiresIn;
    console.log("✅ New auth token generated successfully");
    return newToken;

  } catch (error) {
    console.error("❌ Token generation failed:", error.message);
    // Use provided template as fallback
    cachedToken = TOKEN_TEMPLATE;
    tokenExpiry = now + 120;
    return cachedToken;
  }
}

// =========================
// CHANNEL MAP
// =========================
const CHANNELS = {
  gma: {
    baseUrl: "https://qp-pldt-live-bpk-02-prod.akamaized.net/bpk-tv/pl_sdi2/default/",
    manifest: "index.mpd"
  },
  test: {
    baseUrl: "https://qp-pldt-live-bpk-02-prod.akamaized.net/bpk-tv/pl_sdi1/default/",
    manifest: "index.mpd"
  }
};

// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>HONOR TV PH</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{height:100vh;display:flex;justify-content:center;align-items:center;background:linear-gradient(135deg,#0f2027,#203a43,#2c5364);font-family:Arial,sans-serif;color:#fff;text-align:center}
.box{background:rgba(0,0,0,.45);padding:30px 40px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.5);max-width:420px;width:90%}
h1{color:#00e5ff;margin-bottom:10px}
p{margin-top:8px}
</style>
</head>
<body>
  <div class="box">
    <h1>📺 HONOR TV PH</h1>
    <p>Enjoy Watching</p>
    <p><small>© 2026</small></p>
  </div>
</body>
</html>
`);
});

// =========================
// DASH PROXY ROUTE WITH AUTH
// =========================
app.get("/:channelId/*", async (req, res) => {
  const channelId = req.params.channelId;
  const filePath = req.params[0];

  const channel = CHANNELS[channelId];
  if (!channel) return res.status(404).send("Channel not found");

  try {
    // Get valid auth token
    const authToken = await getValidAuthToken();
    // Append token to target URL
    const separator = channel.baseUrl.includes("?") ? "&" : "?";
    const targetUrl = `${channel.baseUrl}${filePath}${separator}${authToken}`;

    console.log(`🔄 Proxying: ${targetUrl.substring(0, 100)}...`);

    const upstream = await fetch(targetUrl, {
      agent: httpsAgent,
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        Accept: "*/*",
        Referer: channel.baseUrl,
        Origin: new URL(channel.baseUrl).origin
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Upstream error: ${upstream.status}`);
    }

    // Forward headers
    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);

    // CORS + Cache
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

    // Stream response
    upstream.body.pipe(res);

  } catch (err) {
    console.error("❌ Proxy Error:", err);
    res.status(500).json({ error: "Proxy server error", message: err.message });
  }
});

// =========================
// MANIFEST SHORTCUT ROUTES
// =========================
Object.entries(CHANNELS).forEach(([id, data]) => {
  app.get(`/${id}`, (req, res) => res.redirect(`/${id}/${data.manifest}`));
});

// =========================
// HEALTH CHECK
// =========================
app.get("/health", async (req, res) => {
  const token = await getValidAuthToken();
  res.json({
    status: "ok",
    server: "HONOR TV PH Proxy",
    authEndpoint: AUTH_TOKEN_URL,
    tokenStatus: token ? "valid" : "missing",
    channels: Object.fromEntries(
      Object.entries(CHANNELS).map(([id, data]) => [id, `/${id}/${data.manifest}`])
    )
  });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`🚀 HONOR TV PH Proxy running on port ${PORT}`);
  console.log(`🔐 Auth endpoint: ${AUTH_TOKEN_URL}`);
  console.log("\nAvailable Channels:");
  Object.entries(CHANNELS).forEach(([id, data]) => {
    console.log(`➡ ${id}: http://localhost:${PORT}/${id}`);
  });
});
