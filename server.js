import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

/* ================= STREAM SOURCES ================= */
const ottStreamURL = "https://hntv.netlify.app/free-playlist";
const altStreamURL = "https://pastebin.com/raw/YctRidwE";

/* ================= USER-AGENT LIST (EDITABLE) ================= */
let allowedAgents = [
  "OTT Navigator",
  "OTT Player",
  "OTT TV"
];

/* ================= SECURITY ================= */
const DASHBOARD_KEY = "admin123"; // 🔐 change this

/* ================= LOG STORAGE ================= */
const accessLogs = [];

/* ================= MAIN STREAM ROUTE ================= */
/* THIS IS YOUR TARGET LINK: example.com/playlist.m3u */
app.get("/playlist.m3u", async (req, res) => {
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const isOTT = allowedAgents.some(agent =>
    userAgent.includes(agent)
  );

  const streamURL = isOTT ? ottStreamURL : altStreamURL;

  accessLogs.unshift({
    time: new Date().toLocaleString(),
    ip,
    userAgent,
    type: isOTT ? "OTT APP" : "BROWSER",
    stream: isOTT ? "OTT STREAM" : "ALT STREAM"
  });

  if (accessLogs.length > 200) accessLogs.pop();

  try {
    const response = await fetch(streamURL, {
      headers: {
        "User-Agent": userAgent   // ✅ ONLY USER-AGENT
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
</head>
<body>
<h2>📊 Access Logs</h2>
<a href="/agents?key=${DASHBOARD_KEY}">⚙ Manage User Agents</a>
<table border="1" cellpadding="5">
<tr>
<th>Time</th><th>IP</th><th>Type</th><th>Stream</th><th>User-Agent</th>
</tr>
${accessLogs.map(l => `
<tr>
<td>${l.time}</td>
<td>${l.ip}</td>
<td>${l.type}</td>
<td>${l.stream}</td>
<td>${l.userAgent}</td>
</tr>
`).join("")}
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
</head>
<body>
<h2>⚙ Allowed User-Agent Manager</h2>
<a href="/dashboard?key=${DASHBOARD_KEY}">⬅ Back</a>

<form method="POST" action="/agents/add?key=${DASHBOARD_KEY}">
<input name="agent" placeholder="New User-Agent" required>
<button>Add</button>
</form>

<table border="1" cellpadding="5">
<tr><th>User-Agent</th><th>Action</th></tr>
${allowedAgents.map((agent, i) => `
<tr>
<td>${agent}</td>
<td>
<form method="POST" action="/agents/delete?key=${DASHBOARD_KEY}">
<input type="hidden" name="index" value="${i}">
<button>Delete</button>
</form>
</td>
</tr>
`).join("")}
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
