import express from "express";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 4173);
const GEMINI_API_KEY = "[REMOVED_GEMINI_KEY]";
const ALLOWED_MODELS = new Set([
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
]);
const ALLOWED_RATIOS = new Set(["1:1", "4:3", "3:2", "16:9"]);
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_REQUESTS = 45;
const ipBuckets = new Map();

let referencePartPromise = null;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

function checkRateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();

  const existing = ipBuckets.get(ip) || [];
  const recent = existing.filter((ts) => now - ts < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX_REQUESTS) {
    res.status(429).json({
      error: {
        message: "Rate limit reached for this demo. Please try again later.",
      },
    });
    return;
  }

  recent.push(now);
  ipBuckets.set(ip, recent);
  next();
}

async function getReferencePart() {
  if (referencePartPromise) {
    return referencePartPromise;
  }

  referencePartPromise = (async () => {
    const refPath = path.join(__dirname, "default-plush-reference.png");
    const data = await fs.readFile(refPath);
    return {
      inlineData: {
        mimeType: "image/png",
        data: data.toString("base64"),
      },
    };
  })();

  return referencePartPromise;
}

app.use(express.json({ limit: "1mb" }));
app.use(checkRateLimit);

app.post("/api/generate-image", async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      res.status(500).json({
        error: {
          message: "Server is missing GEMINI_API_KEY. Add it to .env before starting.",
        },
      });
      return;
    }

    const { model, aspectRatio, prompt } = req.body || {};

    if (!ALLOWED_MODELS.has(model)) {
      res.status(400).json({
        error: {
          message: "Unsupported model.",
        },
      });
      return;
    }

    if (!ALLOWED_RATIOS.has(aspectRatio)) {
      res.status(400).json({
        error: {
          message: "Unsupported aspect ratio.",
        },
      });
      return;
    }

    if (typeof prompt !== "string" || prompt.trim().length < 20 || prompt.length > 8000) {
      res.status(400).json({
        error: {
          message: "Prompt is missing or invalid.",
        },
      });
      return;
    }

    const referencePart = await getReferencePart();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const requestBody = {
      contents: [
        {
          parts: [
            referencePart,
            {
              text: "Reference lock: edit the same plush identity from the provided image. Do not invent a different plush model.",
            },
            { text: prompt },
            referencePart,
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio,
        },
      },
    };

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const upstreamJson = await upstream.json();

    if (!upstream.ok) {
      const message = upstreamJson?.error?.message || "Image generation failed upstream.";
      res.status(upstream.status).json({ error: { message } });
      return;
    }

    const parts = (upstreamJson.candidates || []).flatMap((candidate) => candidate?.content?.parts || []);
    const imagePart = parts.find((part) => part?.inlineData?.data || part?.inline_data?.data);

    if (!imagePart) {
      res.status(502).json({
        error: {
          message: "Model returned no image data.",
        },
      });
      return;
    }

    const inline = imagePart.inlineData || imagePart.inline_data;
    const mimeType = inline.mimeType || inline.mime_type || "image/png";

    res.json({
      imageUrl: `data:${mimeType};base64,${inline.data}`,
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error?.message || "Unexpected server error.",
      },
    });
  }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`GypsyGold app listening on http://127.0.0.1:${PORT}`);
});
