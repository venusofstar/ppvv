const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Change this to your own Akamai EdgeAuth secret.
const SECRET = process.env.AKAMAI_SECRET || "YOUR_AKAMAI_SECRET";

app.get("/", (req, res) => {
    res.json({
        message: "Akamai HDNTS Token Generator API",
        example: "/token?acl=*",
    });
});

app.get("/token", (req, res) => {
    try {
        const acl = req.query.acl || "*";
        const id = req.query.id || "guest";
        const duration = parseInt(req.query.duration || 120);

        const st = Math.floor(Date.now() / 1000);
        const exp = st + duration;

        const token =
            `st=${st}` +
            `~exp=${exp}` +
            `~acl=${acl}` +
            `~id=${id}`;

        const hmac = crypto
            .createHmac("sha256", SECRET)
            .update(token)
            .digest("hex");

        const hdnts = `${token}~hmac=${hmac}`;

        res.json({
            st,
            exp,
            acl,
            id,
            hdnts
        });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
