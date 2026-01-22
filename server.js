import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= STREAM SOURCES ================= */
const ottStreamURL = "https://hntv.netlify.app/free-playlist";
const altStreamURL = "https://pastebin.com/raw/YctRidwE";

/* ================= USER-AGENT RULES ================= */
const allowedAgents = [
  "OTT Navigator",
  "OTT Player",
  "OTT TV"
];

/* ================= SECURITY ================= */
const FORCED_REFERER = "https://hntv.netlify.app/free-playlist";
const DASHBOARD_KEY = "admin123"; // 🔐 change this

/* ================= MEMORY LOGS ================= */
const accessLogs = [];

/* ================= MAIN STREAM ROUTE ================= */
app.get("/", async (req, res) => {
  const userAgent = req.headers["user-agent"] || "Unknown";
  const ip =
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress;

  const isOTT = allowedAgents.some(agent =>
    userAgent.includes(agent)
  );

  const streamURL = isOTT ? ottStreamURL : altStreamURL;

  // Save access log
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
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

/* ================= DASHBOARD ================= */
app.get("/dashboard", (req, res) => {
  if (req.query.key !== DASHBOARD_KEY) {
    return res.status(403).send("Access Denied");
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>UA Access Dashboard</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body {
  background:#0f172a;
  color:#e5e7eb;
  font-family:Arial, sans-serif;
  padding:20px;
}
h1 { color:#38bdf8; }
table {
  width:100%;
  border-collapse:collapse;
  margin-top:15px;
}
th, td {
  padding:10px;
  border-bottom:1px solid #334155;
  font-size:13px;
}
th { background:#1e293b; }
tr:hover { background:#1e293b; }
.ott { color:#22c55e; font-weight:bold; }
.browser { color:#f97316; font-weight:bold; }
small { color:#94a3b8; }
</style>
</head>
<body>

<h1>📊 User-Agent Access Dashboard</h1>
<p>Total Requests: <b>${accessLogs.length}</b></p>

<table>
<tr>
  <th>Time</th>
  <th>IP</th>
  <th>Type</th>
  <th>Stream</th>
  <th>User-Agent</th>
</tr>

${accessLogs.map(log => `
<tr>
  <td>${log.time}</td>
  <td>${log.ip}</td>
  <td class="${log.type === "OTT APP" ? "ott" : "browser"}">${log.type}</td>
  <td>${log.stream}</td>
  <td><small>${log.userAgent}</small></td>
</tr>
`).join("")}

</table>

</body>
</html>
`);
});

/* ================= SERVER START ================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
