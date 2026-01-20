const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const { pipeline } = require("stream");
const { URL } = require("url");

const app = express();
app.use(cors());

app.get("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Missing url");

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": new URL(target).origin
      }
    });

    res.set("Content-Type", response.headers.get("content-type"));
    pipeline(response.body, res, () => {});
  } catch (e) {
    res.status(500).send("Proxy error");
  }
});

app.listen(4123, () =>
  console.log("Proxy running on port 4123")
);
