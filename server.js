import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= CONFIG ================= */

const SECRET_KEY = process.env.SECRET_KEY || "CHANGE_THIS_SECRET";
const ADMIN_KEY  = process.env.ADMIN_KEY  || "admin123";

// Stream URLs
const ottStreamURL = "https://hntv.netlify.app/free-playlist";
const altStreamURL = "https://pastebin.com/raw/YctRidwE";

const allowedAgents = ["OTT Navigator", "OTT Player", "OTT TV"];
const FORCED_REFERER = "https://hntv.netlify.app/free-playlist";

/* ================= MEMORY STORAGE ================= */
// (Render/GitHub friendly – no fs)
const devices = {};

/* ================= TOKEN ================= */

function generateDeviceToken(deviceId, expiryMinutes = 60) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiryMinutes * 60;
  const raw = `${deviceId}|${expiresAt}`;
  const payload = Buffer.from(raw).toString("base64");

  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");

  return { token: `${payload}.${signature}`, expiresAt };
}

function verifyDeviceToken(token, deviceId) {
  const device = devices[deviceId];
  if (!device || device.revoked) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSig) return false;

  const decoded = Buffer.from(payload, "base64").toString();
  const [id, exp] = decoded.split("|");

  return id === deviceId && Date.now() / 1000 < exp;
}

function extractDeviceData(ua) {
  const m = ua.match(/;\s*([^:]+):([A-Za-z0-9+/=.-]+)\)$/);
  return m ? { deviceId: m[1], token: m[2] } : null;
}

/* ================= STREAM ================= */

app.get("/", async (req, res) => {
  const ua = req.headers["user-agent"] || "";
  const data = extractDeviceData(ua);

  if (!data || !verifyDeviceToken(data.token, data.deviceId)) {
    return res.status(403).send("Access denied");
  }

  const streamURL = allowedAgents.some(a => ua.includes(a))
    ? ottStreamURL
    : altStreamURL;

  try {
    const response = await fetch(streamURL, {
      headers: {
        "User-Agent": ua,
        "Referer": FORCED_REFERER,
        "Origin": FORCED_REFERER
      }
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    response.body.pipe(res);

  } catch {
    res.status(500).send("Stream error");
  }
});

/* ================= ADMIN API ================= */

function adminAuth(req, res, next) {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).send("Unauthorized");
  }
  next();
}

app.post("/admin/create", adminAuth, (req, res) => {
  const { deviceId, minutes } = req.body;
  if (!deviceId) return res.status(400).send("deviceId required");

  const { token, expiresAt } = generateDeviceToken(deviceId, minutes || 60);
  devices[deviceId] = { token, expiresAt, revoked: false };

  res.json({ deviceId, token, expiresAt });
});

app.post("/admin/revoke", adminAuth, (req, res) => {
  const { deviceId } = req.body;
  if (devices[deviceId]) devices[deviceId].revoked = true;
  res.json({ success: true });
});

app.get("/admin/devices", adminAuth, (req, res) => {
  res.json(devices);
});

/* ================= DASHBOARD UI ================= */

app.get("/admin", adminAuth, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>OTT Dashboard</title>
<style>
body{background:#0f0f0f;color:#fff;font-family:Arial;padding:20px}
input,button{padding:8px;margin:5px}
table{width:100%;border-collapse:collapse;margin-top:20px}
td,th{border:1px solid #333;padding:8px}
button{cursor:pointer}
</style>
</head>
<body>

<h2>OTT Device Dashboard</h2>

<h3>Create Token</h3>
<input id="device" placeholder="Device ID">
<input id="minutes" value="60">
<button onclick="create()">Generate</button>

<table>
<thead>
<tr>
<th>Device</th><th>Expires</th><th>Status</th><th>User-Agent</th><th>Action</th>
</tr>
</thead>
<tbody id="list"></tbody>
</table>

<script>
const key = "${ADMIN_KEY}";

async function load(){
 const r = await fetch("/admin/devices?key="+key);
 const d = await r.json();
 list.innerHTML="";
 for(const id in d){
  const x=d[id];
  const ua=\`OTT TV/1.7.2.2 (Linux;Android 13; en; \${id}:\${x.token})\`;
  list.innerHTML+=\`
  <tr>
   <td>\${id}</td>
   <td>\${new Date(x.expiresAt*1000).toLocaleString()}</td>
   <td>\${x.revoked?"REVOKED":"ACTIVE"}</td>
   <td style="font-size:11px">\${ua}</td>
   <td><button onclick="revoke('\${id}')">Revoke</button></td>
  </tr>\`;
 }
}

async function create(){
 await fetch("/admin/create?key="+key,{
  method:"POST",
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    deviceId:device.value,
    minutes:minutes.value
  })
 });
 load();
}

async function revoke(id){
 await fetch("/admin/revoke?key="+key,{
  method:"POST",
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({deviceId:id})
 });
 load();
}

load();
</script>
</body>
</html>
`);
});

/* ================= START ================= */

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
