import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

/* ================= TARGET PLAYLIST ================= */
const TARGET_STREAM = "https://masports.dpdns.org/playlist.m3u";

/* ================= USER-AGENT LIST ================= */
let allowedAgents = [
  "OTT Navigator",
  "OTT Player",
  "OTT TV",
  "IPTV",
  "VLC"
];

/* ================= SECURITY ================= */
const DASHBOARD_KEY = process.env.DASHBOARD_KEY || "admin123"; // 🔐 change this

/* ================= LOG STORAGE ================= */
const accessLogs = [];

/* ================= MAIN PLAYLIST ROUTE ================= */
app.get("/playlist.m3u", async (req, res) => {
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const isOTT = allowedAgents.some(agent =>
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );

  accessLogs.unshift({
    time: new Date().toLocaleString(),
    ip,
    userAgent,
    type: isOTT ? "OTT APP" : "BROWSER",
    stream: "MASPORTS"
  });

  if (accessLogs.length > 200) accessLogs.pop();

  // Optional: block non-OTT clients
  // if (!isOTT) {
  //   return res.status(403).send("OTT Apps Only");
  // }

  try {
    const response = await fetch(TARGET_STREAM, {
      headers: {
        "User-Agent": userAgent
      }
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    response.body.pipe(res);

  } catch (err) {
    res.status(500).send("Stream Error");
  }
});

/* ================= ACCESS DASHBOARD ================= */
app.get("/dashboard", (req, res) => {
  if (req.query.key !== DASHBOARD_KEY) {
    return res.status(403).send("Access Denied");
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Access Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#0f172a;color:#e5e7eb;font-family:Arial;padding:20px}
table{width:100%;border-collapse:collapse}
th,td{padding:8px;border-bottom:1px solid #334155;font-size:13px}
th{background:#1e293b}
.ott{color:#22c55e;font-weight:bold}
.browser{color:#f97316;font-weight:bold}
a{color:#38bdf8}
</style>
</head>
<body>

<h2>📊 Access Logs</h2>
<p>
<a href="/agents?key=${DASHBOARD_KEY}">⚙ Manage User Agents</a>
</p>

<table>
<tr>
<th>Time</th><th>IP</th><th>Type</th><th>Stream</th><th>User-Agent</th>
</tr>
${accessLogs.map(l => `
<tr>
<td>${l.time}</td>
<td>${l.ip}</td>
<td class="${l.type === "OTT APP" ? "ott" : "browser"}">${l.type}</td>
<td>${l.stream}</td>
<td>${l.userAgent}</td>
</tr>`).join("")}
</table>

</body>
</html>
`);
});

/* ================= USER AGENT MANAGER ================= */
app.get("/agents", (req, res) => {
  if (req.query.key !== DASHBOARD_KEY) {
    return res.status(403).send("Access Denied");
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>User Agent Manager</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#020617;color:#e5e7eb;font-family:Arial;padding:20px}
input,button{padding:8px;font-size:14px}
table{width:100%;border-collapse:collapse;margin-top:15px}
th,td{padding:8px;border-bottom:1px solid #334155}
th{background:#1e293b}
button{cursor:pointer}
.add{background:#22c55e;color:#000;border:none}
.del{background:#ef4444;color:#fff;border:none}
a{color:#38bdf8}
</style>
</head>
<body>

<h2>⚙ Allowed User-Agent Manager</h2>
<p><a href="/dashboard?key=${DASHBOARD_KEY}">⬅ Back to Dashboard</a></p>

<form method="POST" action="/agents/add?key=${DASHBOARD_KEY}">
  <input name="agent" placeholder="New User-Agent" required>
  <button class="add">Add</button>
</form>

<table>
<tr><th>User-Agent</th><th>Action</th></tr>
${allowedAgents.map((agent, i) => `
<tr>
<td>${agent}</td>
<td>
<form method="POST" action="/agents/delete?key=${DASHBOARD_KEY}">
<input type="hidden" name="index" value="${i}">
<button class="del">Delete</button>
</form>
</td>
</tr>`).join("")}
</table>

</body>
</html>
`);
});

/* ================= ADD AGENT ================= */
app.post("/agents/add", (req, res) => {
  if (req.query.key !== DASHBOARD_KEY) {
    return res.status(403).send("Denied");
  }

  const agent = req.body.agent?.trim();
  if (agent && !allowedAgents.includes(agent)) {
    allowedAgents.push(agent);
  }
  res.redirect(`/agents?key=${DASHBOARD_KEY}`);
});

/* ================= DELETE AGENT ================= */
app.post("/agents/delete", (req, res) => {
  if (req.query.key !== DASHBOARD_KEY) {
    return res.status(403).send("Denied");
  }

  const index = parseInt(req.body.index);
  if (!isNaN(index)) {
    allowedAgents.splice(index, 1);
  }
  res.redirect(`/agents?key=${DASHBOARD_KEY}`);
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📺 Playlist: http://localhost:${PORT}/playlist.m3u`);
});
