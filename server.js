
const express = require("express");
const PubNub = require("pubnub");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

// ===================================
// PUBNUB CONFIGURATION
// ===================================

const pubnub = new PubNub({
    publishKey: process.env.PUB_KEY || "demo",
    subscribeKey: process.env.SUB_KEY || "demo",
    userId: "stream-server"
});

// ===================================
// SAMPLE STREAMS (YOUR OWN STREAMS)
// ===================================

let streams = [
    {
        id: "1001",
        name: "Demo Live 1",
        type: "hls",
        url: "https://example.com/live/stream1/playlist.m3u8",
        status: "LIVE"
    },
    {
        id: "1002",
        name: "Demo Live 2",
        type: "hls",
        url: "https://example.com/live/stream2/playlist.m3u8",
        status: "OFFLINE"
    }
];

// ===================================
// ROUTES
// ===================================

// Home
app.get("/", (req, res) => {
    res.json({
        service: "Streaming API",
        version: "1.0.0",
        status: "ONLINE"
    });
});

// Health Check
app.get("/api/health", (req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: Date.now()
    });
});

// Get all streams
app.get("/api/streams", (req, res) => {
    res.json(streams);
});

// Get stream by ID
app.get("/api/streams/:id", (req, res) => {
    const stream = streams.find(
        s => s.id === req.params.id
    );

    if (!stream) {
        return res.status(404).json({
            error: "Stream not found"
        });
    }

    res.json(stream);
});

// Add a stream
app.post("/api/streams", (req, res) => {
    const stream = {
        id: Date.now().toString(),
        name: req.body.name,
        type: req.body.type || "hls",
        url: req.body.url,
        status: req.body.status || "OFFLINE"
    };

    streams.push(stream);

    res.json({
        success: true,
        stream
    });
});

// Update stream status
app.post("/api/streams/:id/status", async (req, res) => {
    const stream = streams.find(
        s => s.id === req.params.id
    );

    if (!stream) {
        return res.status(404).json({
            error: "Stream not found"
        });
    }

    stream.status = req.body.status;

    try {
        await pubnub.publish({
            channel: "live-updates",
            message: {
                id: stream.id,
                name: stream.name,
                status: stream.status,
                timestamp: Date.now()
            }
        });

        res.json({
            success: true,
            message: "Status updated."
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// Delete stream
app.delete("/api/streams/:id", (req, res) => {
    streams = streams.filter(
        s => s.id !== req.params.id
    );

    res.json({
        success: true
    });
});

// ===================================
// START SERVER
// ===================================

app.listen(PORT, () => {
    console.log("");
    console.log("=================================");
    console.log("STREAMING API SERVER STARTED");
    console.log("=================================");
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log("=================================");
});
