const fs = require("node:fs/promises");
const path = require("node:path");

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

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function getClientIp(event) {
  const headers = event.headers || {};
  const forwarded = headers["x-forwarded-for"] || headers["X-Forwarded-For"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  const netlifyIp = headers["x-nf-client-connection-ip"] || headers["X-Nf-Client-Connection-Ip"];
  return typeof netlifyIp === "string" && netlifyIp.length > 0 ? netlifyIp : "unknown";
}

function isRateLimited(event) {
  const ip = getClientIp(event);
  const now = Date.now();
  const recent = (ipBuckets.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS);

  if (recent.length >= RATE_MAX_REQUESTS) {
    return true;
  }

  recent.push(now);
  ipBuckets.set(ip, recent);
  return false;
}

async function getReferencePart() {
  if (referencePartPromise) {
    return referencePartPromise;
  }

  referencePartPromise = (async () => {
    const candidatePaths = [
      path.resolve(__dirname, "../../default-plush-reference.png"),
      path.resolve(process.cwd(), "default-plush-reference.png"),
    ];

    for (const refPath of candidatePaths) {
      try {
        const data = await fs.readFile(refPath);
        return {
          inlineData: {
            mimeType: "image/png",
            data: data.toString("base64"),
          },
        };
      } catch {
        // Try next path.
      }
    }

    throw new Error("default-plush-reference.png could not be loaded in function runtime.");
  })();

  return referencePartPromise;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: { message: "Method not allowed." } });
    }

    if (isRateLimited(event)) {
      return json(429, {
        error: {
          message: "Rate limit reached for this demo. Please try again later.",
        },
      });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
    if (!GEMINI_API_KEY) {
      return json(500, {
        error: {
          message: "Server is missing GEMINI_API_KEY. Set it in Netlify Environment Variables.",
        },
      });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(event.body || "{}");
    } catch {
      return json(400, {
        error: {
          message: "Invalid JSON request body.",
        },
      });
    }

    const { model, aspectRatio, prompt } = parsedBody;

    if (!ALLOWED_MODELS.has(model)) {
      return json(400, {
        error: {
          message: "Unsupported model.",
        },
      });
    }

    if (!ALLOWED_RATIOS.has(aspectRatio)) {
      return json(400, {
        error: {
          message: "Unsupported aspect ratio.",
        },
      });
    }

    if (typeof prompt !== "string" || prompt.trim().length < 20 || prompt.length > 8000) {
      return json(400, {
        error: {
          message: "Prompt is missing or invalid.",
        },
      });
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

    const upstreamJson = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return json(upstream.status, {
        error: {
          message: upstreamJson?.error?.message || "Image generation failed upstream.",
        },
      });
    }

    const parts = (upstreamJson?.candidates || []).flatMap((candidate) => candidate?.content?.parts || []);
    const imagePart = parts.find((part) => part?.inlineData?.data || part?.inline_data?.data);

    if (!imagePart) {
      return json(502, {
        error: {
          message: "Model returned no image data.",
        },
      });
    }

    const inline = imagePart.inlineData || imagePart.inline_data;
    const mimeType = inline.mimeType || inline.mime_type || "image/png";

    return json(200, {
      imageUrl: `data:${mimeType};base64,${inline.data}`,
    });
  } catch (error) {
    return json(500, {
      error: {
        message: error?.message || "Unexpected server error.",
      },
    });
  }
};
