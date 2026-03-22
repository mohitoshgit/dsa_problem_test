const express = require("express");
const cors = require("cors");
const fs = require("fs");
const https = require("https");
const path = require("path");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Serve static files (your HTML page)
app.use(express.static(path.join(__dirname, "public")));

// ✅ API endpoint
app.post("/run", async (req, res) => {
    try {
        const userCode = req.body.code || "";

        let cleaned = userCode.trim();

        // ✅ Remove main() wrapper safely
        const mainRegex = /fun\s+main\s*\(.*?\)\s*\{([\s\S]*)\}$/;

        const match = cleaned.match(mainRegex);

        if (match && match[1]) {
            cleaned = match[1].trim();
        }

        // ✅ Wrap into JVM-compatible class
        const wrappedCode = `
class JDoodle {
    companion object {
        @JvmStatic
        fun main(args: Array<String>) {
${cleaned}
        }
    }
}
`;

        const response = await fetch("https://api.jdoodle.com/v1/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clientId: "43e242fc1e42bb879f5a7360bc816a2e",
                clientSecret: "d88a26ef6a72747a11f4a396550358cd099bbd4b1a65ec6108b392f2100c347d",
                script: wrappedCode,
                language: "kotlin",
                versionIndex: "3"
            })
        });

        const data = await response.json();

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.json(data);

    } catch (err) {
        console.error("Execution error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ HTTPS config (self-signed cert)
const options = {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem")
};

// ✅ Start HTTPS server
https.createServer(options, app).listen(3000, () => {
    console.log("🚀 Server running at https://localhost:3000");
});